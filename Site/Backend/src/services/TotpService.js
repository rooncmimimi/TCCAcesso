import sequelize from "../config/bancoDeDados.js";
import env from "../config/env.js";
import { AutenticacaoTotp, CodigoRecuperacaoTotp, Usuario } from "../models/index.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import SessaoService from "./SessaoService.js";
import SegurancaEventosService from "./SegurancaEventosService.js";
import ErroApi from "../utils/ErroApi.js";
import { compararSenha } from "../utils/bcrypt.js";
import {
    agruparSegredo,
    encontrarPassoValido,
    gerarSegredoBase32,
    gerarUriOtpAuth
} from "../utils/totp.js";
import {
    abrirConfiguracao,
    cifrarSegredoTotp,
    decifrarSegredoTotp,
    gerarCodigosDeRecuperacao,
    hashCodigoDeRecuperacao,
    pareceCodigoDeRecuperacao,
    selarConfiguracao
} from "../utils/segredosMfa.js";

/**
 * Verificação em duas etapas por aplicativo autenticador (TOTP).
 *
 * Regras (o porquê está em cada método):
 * - **Por enquanto só administrador** pode ter TOTP (`MFA_TOTP_TIPOS`), e ele é **opcional**
 *   (`MFA_TOTP_OBRIGATORIO_ADMIN` desligada): quem o ativa passa a ser cobrado em todo login e em toda
 *   rota; quem não ativa segue como antes.
 * - Com a obrigatoriedade ligada, o administrador **não consegue desligar** a própria proteção pela
 *   interface. Para trocar de aparelho ele refaz a configuração (com senha e um código), e para perder tudo existe o reinício
 *   por outro administrador ou pelo script de emergência (`scripts/resetarTotpAdmin.js`). Reinício por
 *   e-mail não existe: quem tomasse a caixa de e-mail desligaria a proteção.
 * - O segredo só é gravado depois de a pessoa provar que o aplicativo gera o código certo.
 * - Um código vale uma vez (guarda o último intervalo aceito), e erros seguidos geram espera.
 * - Nada aqui devolve ou registra segredo, código de recuperação ou código digitado.
 *
 * O serviço não emite sessão: quem orquestra o login (`AutenticacaoService`) e o controller fazem isso,
 * para este módulo não depender do fluxo de sessão.
 */

const LIMITE_FALHAS_SEM_ESPERA = 4;
/** Minutos de espera depois da 5ª, 6ª, 7ª e 8ª ou mais falhas seguidas. */
const ESPERA_PROGRESSIVA_MINUTOS = [1, 5, 15, 60];

function esperaDaFalha(falhas) {
    if (falhas <= LIMITE_FALHAS_SEM_ESPERA) return 0;

    return ESPERA_PROGRESSIVA_MINUTOS[Math.min(falhas - LIMITE_FALHAS_SEM_ESPERA, ESPERA_PROGRESSIVA_MINUTOS.length) - 1];
}

class TotpService {
    habilitado() {
        return Boolean(env.mfa?.habilitado);
    }

    exigirHabilitado() {
        if (!this.habilitado()) {
            throw ErroApi.servicoIndisponivel("A verificação em duas etapas não está disponível agora.");
        }
    }

    /** Este tipo de conta pode ter a verificação? Hoje só administrador (`MFA_TOTP_TIPOS`). */
    elegivel(usuario) {
        return this.habilitado() && (env.mfa.tiposElegiveis ?? ["administrador"]).includes(usuario.tipoUsuario);
    }

    exigirDisponivelPara(usuario) {
        this.exigirHabilitado();

        if (!this.elegivel(usuario)) {
            throw ErroApi.acessoNegado("A verificação em duas etapas ainda não está disponível para este tipo de conta.", {
                codigo: "MFA_INDISPONIVEL_PARA_CONTA"
            });
        }
    }

    /** Obrigatória? Só para administrador, e só com `MFA_TOTP_OBRIGATORIO_ADMIN` ligada. */
    exigidoPara(usuario) {
        return this.elegivel(usuario) && usuario.tipoUsuario === "administrador" && Boolean(env.mfa.obrigatorioAdmin);
    }

    async buscarAtivo(usuarioId, opcoes = {}) {
        return AutenticacaoTotp.findByPk(usuarioId, opcoes);
    }

    /**
     * O que o Site precisa saber da conta (nunca o segredo nem os códigos):
     * `mfaDisponivel` (o recurso está ligado), `mfaConfigurado` e `mfaExigido` (administrador).
     * Com o recurso desligado, ou para um tipo de conta que ainda não o tem, não consulta o banco e nada fica
     * disponível.
     */
    async situacaoDaConta(usuario) {
        if (!this.elegivel(usuario)) {
            return { mfaDisponivel: false, mfaConfigurado: false, mfaExigido: false };
        }

        const ativo = await this.buscarAtivo(usuario.id, { attributes: ["usuarioId"] });

        return { mfaDisponivel: true, mfaConfigurado: Boolean(ativo), mfaExigido: this.exigidoPara(usuario) };
    }

    async codigosRestantes(usuarioId) {
        return CodigoRecuperacaoTotp.count({ where: { usuarioId, usadoEm: null } });
    }

    async estado(usuario) {
        const situacao = await this.situacaoDaConta(usuario);

        if (!situacao.mfaConfigurado) {
            return { ...situacao, codigosRestantes: 0, confirmadoEm: null };
        }

        const [ativo, codigosRestantes] = await Promise.all([
            this.buscarAtivo(usuario.id, { attributes: ["usuarioId", "confirmadoEm"] }),
            CodigoRecuperacaoTotp.count({ where: { usuarioId: usuario.id, usadoEm: null } })
        ]);

        return { ...situacao, codigosRestantes, confirmadoEm: ativo?.confirmadoEm ?? null };
    }

    /**
     * O acesso desta sessão está de acordo com a regra do TOTP?
     *
     * - `ok`: pode seguir.
     * - `nao_configurado`: administrador sem TOTP, **quando a obrigatoriedade está ligada**. Entra, mas só alcança a
     *   configuração. Com a obrigatoriedade desligada (o padrão), administrador sem TOTP segue normalmente.
     * - `necessario`: administrador com TOTP cuja sessão não passou pelo segundo fator (ou passou antes
     *   de o TOTP ser reiniciado ou trocado). Tem de entrar de novo. Vale também com o TOTP opcional: quem o
     *   ativou não pode ter uma sessão sem o segundo fator, senão a proteção seria de enfeite.
     *
     * Só administrador é cobrado a cada requisição: o poder dele é o que justifica o custo da consulta.
     * Para as demais contas o segundo fator vale no login (e as sessões antigas são encerradas quando
     * a pessoa ativa o TOTP).
     */
    async estadoDoAcesso(usuario, payload) {
        if (!this.elegivel(usuario) || usuario.tipoUsuario !== "administrador") {
            return "ok";
        }

        const ativo = await this.buscarAtivo(usuario.id, { attributes: ["usuarioId", "confirmadoEm"] });

        if (!ativo) {
            return this.exigidoPara(usuario) ? "nao_configurado" : "ok";
        }

        const desde = Math.floor(new Date(ativo.confirmadoEm).getTime() / 1000);

        if (!payload?.mfa || payload.mfa < desde) {
            return "necessario";
        }

        return "ok";
    }

    /**
     * Senha atual (quando a conta tem) e um código do segundo fator. É o que ações sensíveis do TOTP
     * pedem: sessão aberta não basta, porque um aparelho esquecido logado não pode desligar nem trocar a
     * proteção.
     */
    async reautenticar(usuario, { senhaAtual, codigo }) {
        const comSenha = await Usuario.scope("comSenha").findByPk(usuario.id, { attributes: ["id", "senhaHash"] });

        if (comSenha?.senhaHash) {
            const confere = Boolean(senhaAtual) && (await compararSenha(senhaAtual, comSenha.senhaHash));

            if (!confere) {
                throw ErroApi.naoAutenticado("Senha atual incorreta.");
            }
        }

        const resultado = await this.conferirSegundoFator(usuario.id, codigo);

        if (!resultado.ok) {
            throw ErroApi.requisicaoInvalida("Código incorreto ou já usado. Confira o aplicativo e tente de novo.", {
                codigo: "MFA_CODIGO_INVALIDO"
            });
        }

        return resultado;
    }

    /**
     * Confere o código do aplicativo (6 dígitos) ou um código de recuperação.
     *
     * Dentro de uma transação com a linha trancada, para duas conferências ao mesmo tempo nunca
     * aceitarem o mesmo código: a segunda espera a primeira terminar e enxerga o `ultimo_passo` novo
     * (ou o código de recuperação já marcado como usado). O contador de erros também é gravado aqui,
     * mesmo quando o código está errado.
     *
     * Devolve `{ ok, metodo }`. Lança 429 durante a espera por erros seguidos.
     */
    async conferirSegundoFator(usuarioId, codigoBruto, { agora = Date.now() } = {}) {
        const transaction = await sequelize.transaction();

        try {
            const registro = await AutenticacaoTotp.findByPk(usuarioId, { transaction, lock: transaction.LOCK.UPDATE });

            if (!registro) {
                await transaction.rollback();
                return { ok: false, metodo: null };
            }

            if (registro.bloqueadoAte && new Date(registro.bloqueadoAte).getTime() > agora) {
                const minutos = Math.max(1, Math.ceil((new Date(registro.bloqueadoAte).getTime() - agora) / 60000));
                await transaction.rollback();

                throw new ErroApi(
                    429,
                    `Muitas tentativas com código incorreto. Tente de novo em ${minutos} minuto${minutos > 1 ? "s" : ""}.`,
                    { codigo: "MFA_ESPERA", minutos }
                );
            }

            const informado = String(codigoBruto ?? "").trim();
            const digitos = informado.replace(/\s+/g, "");
            let metodo = null;

            if (/^\d{6}$/.test(digitos)) {
                const segredo = decifrarSegredoTotp(registro.segredoCifrado, usuarioId);
                const passo = encontrarPassoValido(segredo, digitos, { agora });
                const ultimo = registro.ultimoPasso === null || registro.ultimoPasso === undefined ? -1 : Number(registro.ultimoPasso);

                if (passo !== null && passo > ultimo) {
                    metodo = "totp";
                    await registro.update({ ultimoPasso: passo }, { transaction });
                }
            } else if (pareceCodigoDeRecuperacao(informado)) {
                const [usados] = await CodigoRecuperacaoTotp.update(
                    { usadoEm: new Date(agora) },
                    { where: { usuarioId, codigoHash: hashCodigoDeRecuperacao(informado), usadoEm: null }, transaction }
                );

                if (usados === 1) {
                    metodo = "recuperacao";
                }
            }

            if (metodo) {
                await registro.update({ tentativasFalhas: 0, bloqueadoAte: null }, { transaction });
                await transaction.commit();

                return { ok: true, metodo };
            }

            const falhas = Math.min(registro.tentativasFalhas + 1, 32000);
            const espera = esperaDaFalha(falhas);

            await registro.update(
                { tentativasFalhas: falhas, bloqueadoAte: espera ? new Date(agora + espera * 60000) : null },
                { transaction }
            );
            await transaction.commit();

            return { ok: false, metodo: null };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw erro;
        }
    }

    /**
     * Passo 1 da configuração: gera o segredo e devolve o que o aplicativo precisa (chave para digitar,
     * endereço do QR code) mais a configuração selada, que o cliente devolve na confirmação. Nada é
     * gravado. Quem já tem TOTP só chega aqui provando senha e código (troca de aparelho).
     */
    async iniciarConfiguracao(usuario, reautenticacao = {}) {
        this.exigirDisponivelPara(usuario);

        const ativo = await this.buscarAtivo(usuario.id, { attributes: ["usuarioId"] });

        if (ativo) {
            await this.reautenticar(usuario, reautenticacao);
        }

        const segredo = gerarSegredoBase32();

        return {
            segredo,
            segredoAgrupado: agruparSegredo(segredo),
            uri: gerarUriOtpAuth(segredo, usuario.email, env.mfa.emissor),
            configuracao: selarConfiguracao(segredo, usuario.id, { troca: Boolean(ativo) }),
            troca: Boolean(ativo)
        };
    }

    /**
     * Passo 2: a pessoa digita o código que o aplicativo mostra. Só então o segredo é gravado, os
     * códigos de recuperação são gerados (e devolvidos uma única vez) e as outras sessões da conta são
     * encerradas, porque a proteção acabou de mudar. O chamador emite a sessão nova com
     * `mfaVerificadoEm`.
     */
    async ativar(usuario, { configuracao, codigo }, contexto = {}) {
        this.exigirDisponivelPara(usuario);

        const aberta = abrirConfiguracao(configuracao, usuario.id);

        if (!aberta) {
            throw ErroApi.requisicaoInvalida("A configuração venceu. Comece de novo.", { codigo: "MFA_CONFIGURACAO_EXPIRADA" });
        }

        const passo = encontrarPassoValido(aberta.segredo, codigo);

        if (passo === null) {
            throw ErroApi.requisicaoInvalida("Código incorreto. Confira se o aplicativo mostra o código desta conta e tente de novo.", {
                codigo: "MFA_CODIGO_INVALIDO"
            });
        }

        const transaction = await sequelize.transaction();

        try {
            const existente = await AutenticacaoTotp.findByPk(usuario.id, { transaction, lock: transaction.LOCK.UPDATE });

            if (existente && !aberta.troca) {
                throw ErroApi.conflito("A verificação em duas etapas já está ativa nesta conta.");
            }

            const confirmadoEm = new Date();
            const dados = {
                segredoCifrado: cifrarSegredoTotp(aberta.segredo, usuario.id),
                ultimoPasso: passo,
                tentativasFalhas: 0,
                bloqueadoAte: null,
                confirmadoEm
            };

            if (existente) {
                await existente.update(dados, { transaction });
            } else {
                await AutenticacaoTotp.create({ usuarioId: usuario.id, ...dados }, { transaction });
            }

            const codigosRecuperacao = await this.substituirCodigosDeRecuperacao(usuario.id, { transaction });

            await SessaoService.revogarTodos(usuario.id, { transaction });

            await AdminAuditoriaService.registrar(
                {
                    administradorId: usuario.tipoUsuario === "administrador" ? usuario.id : null,
                    acao: existente ? "totp_trocado" : "totp_ativado",
                    entidadeTipo: "usuario",
                    entidadeId: usuario.id,
                    descricao: existente
                        ? "Aplicativo autenticador trocado; códigos de recuperação refeitos e outras sessões encerradas."
                        : "Verificação em duas etapas ativada; outras sessões encerradas.",
                    metadados: { tipoUsuario: usuario.tipoUsuario },
                    ...contexto
                },
                { transaction }
            );

            await transaction.commit();

            await SegurancaEventosService.registrar(usuario.id, "totp_ativado", contexto, { troca: Boolean(existente) });

            return { codigosRecuperacao, mfaVerificadoEm: confirmadoEm };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw erro;
        }
    }

    /** Apaga os códigos da conta e grava dez novos. Devolve os valores em claro, a única vez que existem. */
    async substituirCodigosDeRecuperacao(usuarioId, { transaction }) {
        await CodigoRecuperacaoTotp.destroy({ where: { usuarioId }, transaction });

        const codigos = gerarCodigosDeRecuperacao();

        await CodigoRecuperacaoTotp.bulkCreate(
            codigos.map((codigo) => ({ usuarioId, codigoHash: hashCodigoDeRecuperacao(codigo) })),
            { transaction }
        );

        return codigos;
    }

    async regenerarCodigosDeRecuperacao(usuario, reautenticacao, contexto = {}) {
        this.exigirDisponivelPara(usuario);

        if (!(await this.buscarAtivo(usuario.id, { attributes: ["usuarioId"] }))) {
            throw ErroApi.requisicaoInvalida("A verificação em duas etapas não está ativa nesta conta.");
        }

        await this.reautenticar(usuario, reautenticacao);

        const transaction = await sequelize.transaction();

        try {
            const codigosRecuperacao = await this.substituirCodigosDeRecuperacao(usuario.id, { transaction });

            await AdminAuditoriaService.registrar(
                {
                    administradorId: usuario.tipoUsuario === "administrador" ? usuario.id : null,
                    acao: "totp_codigos_refeitos",
                    entidadeTipo: "usuario",
                    entidadeId: usuario.id,
                    descricao: "Códigos de recuperação refeitos; os anteriores deixaram de valer.",
                    ...contexto
                },
                { transaction }
            );

            await transaction.commit();

            return { codigosRecuperacao };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw erro;
        }
    }

    /**
     * Desliga o TOTP, com senha e um código. Se a obrigatoriedade para administradores estiver ligada, o
     * administrador não pode (a regra existe justamente para o poder dele não ficar sem a segunda camada).
     */
    async desativar(usuario, reautenticacao, contexto = {}) {
        this.exigirDisponivelPara(usuario);

        if (this.exigidoPara(usuario)) {
            throw ErroApi.acessoNegado(
                "Administradores não podem desativar a verificação em duas etapas. Para trocar de aparelho, configure de novo; se perdeu o acesso, peça o reinício a outro administrador.",
                { codigo: "MFA_OBRIGATORIO" }
            );
        }

        if (!(await this.buscarAtivo(usuario.id, { attributes: ["usuarioId"] }))) {
            throw ErroApi.requisicaoInvalida("A verificação em duas etapas não está ativa nesta conta.");
        }

        await this.reautenticar(usuario, reautenticacao);

        const transaction = await sequelize.transaction();

        try {
            await AutenticacaoTotp.destroy({ where: { usuarioId: usuario.id }, transaction });
            await CodigoRecuperacaoTotp.destroy({ where: { usuarioId: usuario.id }, transaction });

            await AdminAuditoriaService.registrar(
                {
                    administradorId: null,
                    acao: "totp_desativado",
                    entidadeTipo: "usuario",
                    entidadeId: usuario.id,
                    descricao: "Verificação em duas etapas desativada pela própria pessoa.",
                    metadados: { tipoUsuario: usuario.tipoUsuario },
                    ...contexto
                },
                { transaction }
            );

            await transaction.commit();

            await SegurancaEventosService.registrar(usuario.id, "totp_desativado", contexto);

            return { desativado: true };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw erro;
        }
    }

    /**
     * Reinicia o TOTP de uma conta: apaga o segredo e os códigos, encerra todas as sessões e registra
     * na auditoria. A conta volta ao estado "sem TOTP"; se for administrador, só alcança a tela de
     * configuração até ativar de novo.
     *
     * Duas origens, e nenhuma é um pedido por e-mail:
     * - `administrador`: outro administrador (com o próprio TOTP verificado, garantido pelo middleware),
     *   nunca sobre a própria conta;
     * - `script`: operação manual de quem tem acesso ao servidor (`scripts/resetarTotpAdmin.js`).
     */
    async reiniciar(alvoId, { origem, solicitante = null, motivo = null, contexto = {} }) {
        if (origem === "administrador") {
            if (!solicitante || solicitante.tipoUsuario !== "administrador") {
                throw ErroApi.acessoNegado("Apenas administradores podem reiniciar a verificação em duas etapas de outra conta.");
            }

            if (solicitante.id === alvoId) {
                throw ErroApi.acessoNegado("Você não pode reiniciar a sua própria verificação em duas etapas.", {
                    codigo: "MFA_AUTORREINICIO"
                });
            }

            // Quem reinicia a proteção de outra conta precisa ter a SUA. Com a verificação opcional, um administrador só
            // com senha poderia, senão, tirar a segunda camada de outro; com ela ativa, o middleware já garante que esta
            // sessão passou pelo segundo fator.
            if (!(await this.buscarAtivo(solicitante.id, { attributes: ["usuarioId"] }))) {
                throw ErroApi.acessoNegado(
                    "Para reiniciar a verificação em duas etapas de outra conta, ative primeiro a sua própria.",
                    { codigo: "MFA_REQUER_TOTP_PROPRIO" }
                );
            }
        }

        const transaction = await sequelize.transaction();

        try {
            const alvo = await Usuario.findByPk(alvoId, { transaction, lock: transaction.LOCK.UPDATE });

            if (!alvo) {
                throw ErroApi.naoEncontrado("Conta não encontrada.");
            }

            // Por enquanto só administrador tem verificação em duas etapas; reiniciar a de outro tipo de conta não faz
            // sentido e seria um caminho a mais para quem pedisse o reinício de um candidato ou de uma empresa.
            if (origem === "administrador" && alvo.tipoUsuario !== "administrador") {
                throw ErroApi.requisicaoInvalida("Por enquanto só administradores têm verificação em duas etapas.", {
                    codigo: "MFA_INDISPONIVEL_PARA_CONTA"
                });
            }

            const removidos = await AutenticacaoTotp.destroy({ where: { usuarioId: alvoId }, transaction });
            await CodigoRecuperacaoTotp.destroy({ where: { usuarioId: alvoId }, transaction });
            await SessaoService.revogarTodos(alvoId, { transaction });

            await AdminAuditoriaService.registrar(
                {
                    administradorId: solicitante?.id ?? null,
                    acao: origem === "script" ? "totp_reiniciado_por_script" : "totp_reiniciado_por_administrador",
                    entidadeTipo: "usuario",
                    entidadeId: alvoId,
                    descricao:
                        origem === "script"
                            ? "Verificação em duas etapas reiniciada por script de emergência no servidor; sessões encerradas."
                            : "Verificação em duas etapas reiniciada por outro administrador; sessões encerradas.",
                    metadados: {
                        origem,
                        motivo: motivo ? String(motivo).slice(0, 300) : null,
                        tipoUsuario: alvo.tipoUsuario,
                        tinhaTotp: removidos > 0
                    },
                    ...contexto
                },
                { transaction }
            );

            await transaction.commit();

            await SegurancaEventosService.registrar(alvoId, "totp_reiniciado", contexto, { origem });

            return { tinhaTotp: removidos > 0, tipoUsuario: alvo.tipoUsuario };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw erro;
        }
    }
}

export default new TotpService();
