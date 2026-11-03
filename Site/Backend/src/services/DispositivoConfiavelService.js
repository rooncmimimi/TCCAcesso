import crypto from "node:crypto";
import { Op } from "sequelize";

import sequelize from "../config/bancoDeDados.js";
import env from "../config/env.js";
import { DesafioDeDispositivo, DispositivoConfiavel, LinkDeSeguranca, Usuario } from "../models/index.js";
import EmailService from "./EmailService.js";
import SegurancaEventosService from "./SegurancaEventosService.js";
import ErroApi from "../utils/ErroApi.js";
import { assinarDesafioDispositivo, lerDesafioDispositivo } from "../utils/jwt.js";
import { modeloNovoAcesso, modeloVerificacaoDeDispositivo } from "../utils/modelosEmail.js";
import { mascararEmail, rotuloDoDispositivo } from "../utils/rotuloDoDispositivo.js";
import { gerarCodigoNumerico, gerarTokenOpaco, hashToken } from "../utils/tokens.js";
import { montarUrlFrontend } from "../utils/urlFrontend.js";

const MINUTOS_DO_CODIGO = 15;
const MAXIMO_DE_TENTATIVAS = 5;
const MAXIMO_DE_REENVIOS = 3;
const SEGUNDOS_ENTRE_ENVIOS = 60;
/** Códigos pedidos por conta numa hora (inclui reenvios): impede encher a caixa de entrada de quem tem só a senha. */
const MAXIMO_DE_CODIGOS_POR_HORA = 6;
const DIAS_DO_LINK_NAO_FUI_EU = 7;

function chaveDosCodigos() {
    return Buffer.from(crypto.hkdfSync("sha256", env.jwt.secret, "acesso:dispositivo", "codigo", 32));
}

/** HMAC do código, preso ao desafio: o mesmo número não vale em outro desafio, e um vazamento do banco não deixa testá-los às cegas. */
export function hmacDoCodigo(codigo, desafioId) {
    return crypto.createHmac("sha256", chaveDosCodigos()).update(`${desafioId}:${String(codigo).trim()}`).digest("hex");
}

/**
 * Verificação por e-mail ao entrar de um dispositivo novo, e a lista de dispositivos de confiança.
 *
 * - Um dispositivo é **reconhecido** quando o Site manda (`X-Dispositivo`) o token de um dispositivo de confiança ativo, não
 *   revogado e dentro do prazo. O token é aleatório; só o hash fica no banco.
 * - Quem tem verificação em duas etapas (TOTP) já tem segundo fator e **não** passa por aqui.
 * - Com a chave ligada mas o e-mail indisponível (sem Brevo), o recurso fica **inativo** em vez de trancar todo mundo para
 *   fora; o servidor avisa na inicialização. Com o e-mail configurado mas um envio que falha, o login é **recusado** (503): é
 *   melhor a pessoa tentar de novo do que entrar sem a verificação.
 */
class DispositivoConfiavelService {
    habilitado() {
        return Boolean(env.seguranca?.dispositivosHabilitado);
    }

    /** O recurso está ativo de verdade: chave ligada E e-mail capaz de enviar. */
    disponivel() {
        return this.habilitado() && EmailService.disponivel();
    }

    exigirHabilitado() {
        if (!this.habilitado()) {
            throw ErroApi.servicoIndisponivel("Este recurso não está disponível agora.");
        }
    }

    hashDoToken(token) {
        return hashToken(token);
    }

    /** O aparelho é reconhecido? Se sim, registra o uso. */
    async reconhecido(usuarioId, tokenDoDispositivo) {
        if (!tokenDoDispositivo || typeof tokenDoDispositivo !== "string" || tokenDoDispositivo.length > 200) {
            return false;
        }

        const dispositivo = await DispositivoConfiavel.findOne({
            where: { usuarioId, tokenHash: hashToken(tokenDoDispositivo), revogadoEm: null, expiraEm: { [Op.gt]: new Date() } }
        });

        if (!dispositivo) {
            return false;
        }

        await dispositivo.update({ ultimoUsoEm: new Date() });

        return true;
    }

    async enviarCodigo(usuario, { codigo, desafio, contexto, nomeDoDispositivo }) {
        const { assunto, html, texto } = modeloVerificacaoDeDispositivo({
            nome: usuario.nome,
            codigo,
            minutosValidade: MINUTOS_DO_CODIGO,
            dispositivo: nomeDoDispositivo,
            ip: contexto.ip
        });

        try {
            await EmailService.enviar({ para: usuario.email, nomeDestinatario: usuario.nome, assunto, html, texto, tag: "verificacao-dispositivo" });
        } catch {
            // O código não chegou: não deixa um desafio aberto que ninguém vai conseguir usar.
            await desafio.update({ substituidoEm: new Date() });

            throw ErroApi.servicoIndisponivel("Não foi possível enviar o código por e-mail agora. Tente novamente em instantes.");
        }
    }

    montarResposta(usuario, desafio, { confirmarReativacao }) {
        return {
            verificacaoDispositivo: true,
            desafioDispositivo: assinarDesafioDispositivo({ sub: usuario.id, did: desafio.id, cr: confirmarReativacao ? 1 : 0 }),
            emailMascarado: mascararEmail(usuario.email),
            validadeEmMinutos: MINUTOS_DO_CODIGO,
            reenvioEmSegundos: SEGUNDOS_ENTRE_ENVIOS
        };
    }

    async criarDesafio(usuario, contexto, { reenvios = 0, confirmarReativacao = false } = {}) {
        const recentes = await DesafioDeDispositivo.count({
            where: { usuarioId: usuario.id, criadoEm: { [Op.gt]: new Date(Date.now() - 60 * 60 * 1000) } }
        });

        if (recentes >= MAXIMO_DE_CODIGOS_POR_HORA) {
            throw new ErroApi(429, "Muitos códigos foram pedidos para esta conta. Aguarde um pouco antes de tentar de novo.", {
                codigo: "DISPOSITIVO_CODIGOS_DEMAIS"
            });
        }

        const codigo = gerarCodigoNumerico(6);
        const id = crypto.randomUUID();

        // Um código novo invalida o anterior: nunca há dois códigos válidos ao mesmo tempo.
        await DesafioDeDispositivo.update(
            { substituidoEm: new Date() },
            { where: { usuarioId: usuario.id, utilizadoEm: null, substituidoEm: null } }
        );

        const desafio = await DesafioDeDispositivo.create({
            id,
            usuarioId: usuario.id,
            codigoHash: hmacDoCodigo(codigo, id),
            expiraEm: new Date(Date.now() + MINUTOS_DO_CODIGO * 60 * 1000),
            reenvios,
            ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null,
            userAgent: contexto.userAgent ? String(contexto.userAgent).slice(0, 255) : null
        });

        await this.enviarCodigo(usuario, { codigo, desafio, contexto, nomeDoDispositivo: rotuloDoDispositivo(contexto.userAgent) });

        return this.montarResposta(usuario, desafio, { confirmarReativacao });
    }

    /** Passo 1: a senha estava certa, mas o aparelho é novo. Manda o código e devolve o desafio (sem sessão). */
    async iniciarVerificacao(usuario, contexto = {}, { confirmarReativacao = false } = {}) {
        return this.criarDesafio(usuario, contexto, { confirmarReativacao });
    }

    leitura(desafioJwt) {
        try {
            return lerDesafioDispositivo(desafioJwt);
        } catch {
            throw ErroApi.requisicaoInvalida("A verificação expirou. Entre novamente.", { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" });
        }
    }

    /** Pede outro código, respeitando a espera entre envios e o máximo de reenvios. O código anterior deixa de valer. */
    async reenviar(desafioJwt, contexto = {}) {
        const { sub, did, cr } = this.leitura(desafioJwt);
        const anterior = await DesafioDeDispositivo.findByPk(did);

        if (!anterior || anterior.usuarioId !== sub || anterior.utilizadoEm || anterior.substituidoEm) {
            throw ErroApi.requisicaoInvalida("A verificação expirou. Entre novamente.", { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" });
        }

        const segundosDesdeOEnvio = (Date.now() - new Date(anterior.criadoEm).getTime()) / 1000;

        if (segundosDesdeOEnvio < SEGUNDOS_ENTRE_ENVIOS) {
            const faltam = Math.ceil(SEGUNDOS_ENTRE_ENVIOS - segundosDesdeOEnvio);

            throw new ErroApi(429, `Aguarde ${faltam} segundo${faltam > 1 ? "s" : ""} para pedir outro código.`, {
                codigo: "DISPOSITIVO_REENVIO_ESPERA",
                segundos: faltam
            });
        }

        if (anterior.reenvios >= MAXIMO_DE_REENVIOS) {
            throw new ErroApi(429, "Você já pediu o máximo de códigos novos. Entre novamente para recomeçar.", {
                codigo: "DISPOSITIVO_REENVIOS_DEMAIS"
            });
        }

        const usuario = await Usuario.findByPk(sub);

        if (!usuario) {
            throw ErroApi.requisicaoInvalida("A verificação expirou. Entre novamente.", { codigo: "DISPOSITIVO_DESAFIO_EXPIRADO" });
        }

        return this.criarDesafio(usuario, contexto, { reenvios: anterior.reenvios + 1, confirmarReativacao: cr === 1 });
    }

    /**
     * Passo 2: confere o código. Dentro de uma transação com a linha trancada, para duas conferências ao mesmo tempo nunca
     * aceitarem o mesmo código, e para o contador de tentativas valer mesmo com o código errado. Devolve a conta e a escolha
     * de reativação feita no passo 1.
     */
    async confirmar(desafioJwt, codigoInformado) {
        const { sub, did, cr } = this.leitura(desafioJwt);
        const transaction = await sequelize.transaction();

        try {
            const desafio = await DesafioDeDispositivo.findByPk(did, { transaction, lock: transaction.LOCK.UPDATE });

            if (!desafio || desafio.usuarioId !== sub || desafio.utilizadoEm || desafio.substituidoEm || new Date(desafio.expiraEm) <= new Date()) {
                await transaction.rollback();
                throw ErroApi.requisicaoInvalida("O código expirou ou já foi usado. Peça um novo ou entre novamente.", {
                    codigo: "DISPOSITIVO_DESAFIO_EXPIRADO"
                });
            }

            if (desafio.tentativas >= MAXIMO_DE_TENTATIVAS) {
                await transaction.rollback();
                throw new ErroApi(429, "Muitas tentativas com código incorreto. Peça um novo código.", { codigo: "DISPOSITIVO_TENTATIVAS_DEMAIS" });
            }

            const certo = crypto.timingSafeEqual(Buffer.from(hmacDoCodigo(codigoInformado, desafio.id)), Buffer.from(desafio.codigoHash));

            if (!certo) {
                // `update` já altera a instância: a conta é feita antes, senão a tentativa seria contada duas vezes na mensagem.
                const tentativas = desafio.tentativas + 1;

                await desafio.update({ tentativas }, { transaction });
                await transaction.commit();

                const restantes = MAXIMO_DE_TENTATIVAS - tentativas;

                throw ErroApi.requisicaoInvalida(
                    restantes > 0
                        ? `Código incorreto. Você ainda tem ${restantes} tentativa${restantes > 1 ? "s" : ""}.`
                        : "Código incorreto. Peça um novo código.",
                    { codigo: "DISPOSITIVO_CODIGO_INVALIDO", tentativasRestantes: restantes }
                );
            }

            await desafio.update({ utilizadoEm: new Date() }, { transaction });
            await transaction.commit();

            return { usuarioId: sub, confirmarReativacao: cr === 1 };
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw erro;
        }
    }

    /** Marca este aparelho como de confiança. Devolve o token em claro **uma única vez**: o banco guarda só o hash. */
    async confiar(usuarioId, contexto = {}) {
        const token = gerarTokenOpaco(32);

        await DispositivoConfiavel.create({
            usuarioId,
            tokenHash: hashToken(token),
            rotulo: rotuloDoDispositivo(contexto.userAgent),
            ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null,
            expiraEm: new Date(Date.now() + env.seguranca.diasDeConfianca * 24 * 60 * 60 * 1000)
        });

        await SegurancaEventosService.registrar(usuarioId, "dispositivo_confiavel_adicionado", contexto);

        return token;
    }

    /**
     * Avisa por e-mail que a conta foi acessada de um dispositivo novo, com o link "Não fui eu". Nunca atrapalha o login: uma
     * falha aqui só vai para o log.
     */
    async notificarNovoAcesso(usuario, contexto = {}) {
        try {
            const token = gerarTokenOpaco(48);

            await LinkDeSeguranca.create({
                usuarioId: usuario.id,
                tipo: "nao_fui_eu",
                tokenHash: hashToken(token),
                expiraEm: new Date(Date.now() + DIAS_DO_LINK_NAO_FUI_EU * 24 * 60 * 60 * 1000),
                ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null
            });

            const { assunto, html, texto } = modeloNovoAcesso({
                nome: usuario.nome,
                dispositivo: rotuloDoDispositivo(contexto.userAgent),
                ip: contexto.ip,
                linkNaoFuiEu: montarUrlFrontend("/conta-comprometida", { token })
            });

            await EmailService.enviar({ para: usuario.email, nomeDestinatario: usuario.nome, assunto, html, texto, tag: "novo-acesso" });
        } catch (erro) {
            console.error(JSON.stringify({ nivel: "error", servico: "DispositivoConfiavelService", acao: "notificar_novo_acesso", causa: erro.message }));
        }
    }

    async listar(usuarioId, tokenAtual) {
        const hashAtual = tokenAtual ? hashToken(tokenAtual) : null;

        const dispositivos = await DispositivoConfiavel.findAll({
            where: { usuarioId, revogadoEm: null, expiraEm: { [Op.gt]: new Date() } },
            order: [["ultimoUsoEm", "DESC"]]
        });

        return dispositivos.map((d) => ({
            id: d.id,
            rotulo: d.rotulo ?? "Dispositivo desconhecido",
            ip: d.ip,
            criadoEm: d.criadoEm,
            ultimoUsoEm: d.ultimoUsoEm,
            expiraEm: d.expiraEm,
            atual: hashAtual !== null && d.tokenHash === hashAtual
        }));
    }

    async revogar(usuarioId, id, contexto = {}) {
        const dispositivo = await DispositivoConfiavel.findOne({ where: { id, usuarioId, revogadoEm: null } });

        if (!dispositivo) {
            throw ErroApi.naoEncontrado("Dispositivo não encontrado.");
        }

        await dispositivo.update({ revogadoEm: new Date() });
        await SegurancaEventosService.registrar(usuarioId, "dispositivo_confiavel_revogado", contexto, { rotulo: dispositivo.rotulo });

        return { mensagem: "A confiança neste dispositivo foi removida." };
    }

    /** Remove a confiança de todos os dispositivos da conta (usado também ao proteger a conta). */
    async revogarTodos(usuarioId, { transaction, contexto = null } = {}) {
        const [quantidade] = await DispositivoConfiavel.update(
            { revogadoEm: new Date() },
            { where: { usuarioId, revogadoEm: null }, transaction }
        );

        if (contexto) {
            await SegurancaEventosService.registrar(usuarioId, "dispositivos_confiaveis_revogados", contexto, { quantidade });
        }

        return quantidade;
    }

    /** Limpeza periódica: desafios com mais de 1 dia, links vencidos há mais de 7 e dispositivos vencidos ou revogados há mais de 30. */
    async limparAntigos({ agora = Date.now() } = {}) {
        const DIA = 24 * 60 * 60 * 1000;

        const [desafios, links, dispositivos] = await Promise.all([
            DesafioDeDispositivo.destroy({ where: { criadoEm: { [Op.lt]: new Date(agora - DIA) } } }),
            LinkDeSeguranca.destroy({ where: { expiraEm: { [Op.lt]: new Date(agora - 7 * DIA) } } }),
            DispositivoConfiavel.destroy({
                where: { [Op.or]: [{ expiraEm: { [Op.lt]: new Date(agora - 30 * DIA) } }, { revogadoEm: { [Op.lt]: new Date(agora - 30 * DIA) } }] }
            })
        ]);

        return { desafios, links, dispositivos };
    }
}

export default new DispositivoConfiavelService();
