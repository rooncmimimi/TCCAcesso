import { Op } from "sequelize";

import sequelize from "../config/bancoDeDados.js";
import {
    Usuario,
    Empresa,
    Candidato,
    Postagem,
    PostagemAnexo,
    Denuncia
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { garantirAlvoDeAcaoAdministrativa } from "../utils/autorizacao.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import ArmazenamentoService from "./ArmazenamentoService.js";
import { tentarAvisarPorEmail } from "../utils/avisoEmail.js";
import { modeloContaBloqueada } from "../utils/modelosEmail.js";

/**
 * Painel administrativo: moderação de usuários (bloqueio, exclusão
 * definitiva) e o núcleo de exclusão de conta compartilhado com o
 * self-service (`AutenticacaoService.excluirConta`).
 *
 * Todas as rotas que chegam aqui já passaram por autenticacaoMiddleware +
 * exigirTipoUsuarioMiddleware("administrador"); ainda assim os métodos nunca
 * confiam em identificadores do corpo da requisição para escalonar
 * privilégios (defesa em profundidade).
 */
class AdminUsuarioService {
    async listarUsuarios(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};

        if (query.tipo) {
            where.tipoUsuario = query.tipo;
        }

        if (query.bloqueado !== undefined) {
            where.bloqueado = query.bloqueado === "true";
        }

        if (query.q) {
            const termo = `%${String(query.q).slice(0, 120)}%`;

            where[Op.or] = [
                { nome: { [Op.iLike]: termo } },
                { email: { [Op.iLike]: termo } }
            ];
        }

        const { rows, count } = await Usuario.findAndCountAll({
            where,
            attributes: {
                exclude: ["senhaHash"]
            },
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("usuarios", rows, count, pagina, limite);
    }

    /**
     * Localiza o usuário-alvo de uma ação administrativa restritiva
     * (bloqueio, exclusão etc.), aplicando as duas proteções obrigatórias:
     * o admin não pode agir contra a própria conta, nem contra outra
     * conta administrativa. Centralizado aqui para que toda ação
     * restritiva/destrutiva reutilize a mesma regra em vez de duplicá-la.
     */
    async resolverUsuarioModeravel(
        id,
        solicitante,
        { mensagemAutoAcao, mensagemAdminProtegido }
    ) {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            throw ErroApi.naoEncontrado("Usuário não encontrado.");
        }

        garantirAlvoDeAcaoAdministrativa(usuario, solicitante, {
            mensagemAutoAcao,
            mensagemAdminProtegido
        });

        return usuario;
    }

    async alternarBloqueio(id, { bloqueado, motivo }, solicitante, contexto = {}) {
        const usuario = await this.resolverUsuarioModeravel(id, solicitante, {
            mensagemAutoAcao: "Você não pode bloquear a própria conta.",
            mensagemAdminProtegido:
                "Contas administrativas não podem ser bloqueadas por aqui."
        });

        const estadoAnterior = {
            bloqueado: usuario.bloqueado,
            ativo: usuario.ativo
        };

        const novoEstado =
            bloqueado === undefined ? !usuario.bloqueado : Boolean(bloqueado);

        await usuario.update({
            bloqueado: novoEstado,
            bloqueadoEm: novoEstado ? new Date() : null,
            motivoBloqueio: novoEstado ? motivo || null : null,
            ativo: !novoEstado
        });

        await NotificacaoService.criar({
            usuarioId: usuario.id,
            tipo: "sistema",
            titulo: novoEstado ? "Conta bloqueada" : "Conta reativada",
            descricao: novoEstado
                ? `Sua conta foi bloqueada. Motivo: ${motivo || "não informado"}.`
                : "Sua conta foi reativada pela moderação.",
            subtipo: novoEstado ? "conta_bloqueada" : "conta_reativada"
        });

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: novoEstado ? "bloquear_usuario" : "reativar_usuario",
            entidadeTipo: "usuario",
            entidadeId: usuario.id,
            descricao: novoEstado
                ? `Usuário ${usuario.nome} (${usuario.email}) foi bloqueado.`
                : `Usuário ${usuario.nome} (${usuario.email}) foi reativado.`,
            metadados: {
                antes: estadoAnterior,
                depois: { bloqueado: novoEstado, ativo: !novoEstado },
                motivo: novoEstado ? motivo || null : null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        // Só no bloqueio, nunca na reativação: quem volta a ter acesso vê a notificação dentro do
        // app, mas quem foi bloqueado não tem mais como ver um aviso lá. Enviado sem garantia,
        // depois de tudo já gravado; uma falha da Brevo nunca desfaz nem atrasa o bloqueio.
        if (novoEstado) {
            await tentarAvisarPorEmail({
                usuarioId: usuario.id,
                email: usuario.email,
                nome: usuario.nome,
                template: modeloContaBloqueada({ nome: usuario.nome, motivo: motivo || null }),
                tag: "conta-bloqueada",
                acao: "aviso_conta_bloqueada",
                servico: "AdminUsuarioService"
            });
        }

        return {
            id: usuario.id,
            bloqueado: usuario.bloqueado,
            ativo: usuario.ativo
        };
    }

    /**
     * Reúne as referências a arquivos do Storage da conta, só para saber o que apagar do bucket
     * antes de excluir a conta (as linhas do banco saem pelas próprias FKs, em
     * `excluirContaDefinitivamente`).
     *
     * `raw: true` em toda leitura daqui é proposital: foto de perfil, capa, logo e capa de empresa
     * têm getter que devolve a URL pública final, e para remover do bucket é preciso o caminho cru
     * salvo no banco (a mesma técnica de `UsuarioController` ao trocar foto e capa).
     */
    async _coletarArquivosDaConta(usuario) {
        const itens = [];
        const vistos = new Set();

        const adicionar = (caminho, privado, origem) => {
            if (!caminho || vistos.has(caminho)) return;
            vistos.add(caminho);
            itens.push({ caminho, privado, origem });
        };

        const usuarioCru = await Usuario.findByPk(usuario.id, {
            attributes: ["fotoPerfil", "capaPerfil"],
            raw: true
        });
        adicionar(usuarioCru?.fotoPerfil, false, "usuario.fotoPerfil");
        adicionar(usuarioCru?.capaPerfil, false, "usuario.capaPerfil");

        if (usuario.tipoUsuario === "empresa") {
            const empresa = await Empresa.findOne({
                where: { usuarioId: usuario.id },
                attributes: ["logo", "capa"],
                raw: true
            });
            adicionar(empresa?.logo, false, "empresa.logo");
            adicionar(empresa?.capa, false, "empresa.capa");
        }

        if (usuario.tipoUsuario === "candidato") {
            const candidato = await Candidato.findOne({
                where: { usuarioId: usuario.id },
                attributes: ["curriculo"],
                raw: true
            });
            adicionar(candidato?.curriculo, true, "candidato.curriculo");
        }

        // Anexos das publicações da conta, todos no bucket privado.
        const postagens = await Postagem.findAll({
            where: { usuarioId: usuario.id },
            attributes: ["id"],
            raw: true
        });

        if (postagens.length > 0) {
            const anexos = await PostagemAnexo.findAll({
                where: { postagemId: postagens.map((postagem) => postagem.id) },
                attributes: ["id", "url"],
                raw: true
            });

            for (const anexo of anexos) {
                adicionar(anexo.url, true, `postagem_anexo:${anexo.id}`);
            }
        }

        return itens;
    }

    /**
     * Remove do Storage os arquivos coletados por `_coletarArquivosDaConta`.
     * Best-effort e nunca lança: uma falha aqui não pode impedir a
     * exclusão da conta (mesmo princípio já usado em
     * `NotificacaoService.criar`; infraestrutura secundária nunca
     * derruba a ação principal). Cada item é logado individualmente
     * (sucesso ou falha, com motivo) para permitir limpeza manual
     * posterior de qualquer blob que não tenha sido removido.
     */
    async _removerArquivosDoStorage(itens, usuarioId) {
        const resultados = await Promise.allSettled(
            itens.map((item) =>
                ArmazenamentoService.removerArquivoFisico(item.caminho, {
                    privado: item.privado
                })
            )
        );

        const relatorio = itens.map((item, indice) => {
            const resultado = resultados[indice];
            const sucesso = resultado.status === "fulfilled" && resultado.value === true;
            return {
                origem: item.origem,
                caminho: item.caminho,
                sucesso,
                erro: resultado.status === "rejected" ? String(resultado.reason?.message || resultado.reason) : null
            };
        });

        const falhas = relatorio.filter((r) => !r.sucesso);

        console.info(
            JSON.stringify({
                nivel: "info",
                servico: "AdminUsuarioService.removerUsuario",
                etapa: "limpeza_storage",
                usuarioId,
                total: relatorio.length,
                sucesso: relatorio.length - falhas.length,
                falhas: falhas.length
            })
        );

        if (falhas.length > 0) {
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "AdminUsuarioService.removerUsuario",
                    etapa: "limpeza_storage",
                    motivo: "um_ou_mais_arquivos_nao_foram_removidos_do_storage",
                    usuarioId,
                    falhas
                })
            );
        }

        return relatorio;
    }

    /**
     * Núcleo da exclusão definitiva de uma conta: limpeza do Storage, arquivamento das denúncias
     * pendentes contra a conta e `destroy()`, com o banco numa única transação. Usado pelos dois
     * caminhos de exclusão, `removerUsuario` (administrador, abaixo) e
     * `AutenticacaoService.excluirConta` (o próprio usuário); nenhum outro lugar deve reimplementar
     * esta lógica.
     *
     * Autorização e log de auditoria ficam com quem chama: este método não decide se a ação é
     * permitida (isso já aconteceu antes, pela senha atual ou por
     * `garantirAlvoDeAcaoAdministrativa`) e só grava log se o chamador passar `dentroDaTransacao`,
     * o que só faz sentido na ação administrativa. `dentroDaTransacao` roda antes do commit, na
     * mesma transação do `destroy()`: se o log falhar, a exclusão inteira é desfeita, e a conta
     * nunca fica excluída sem log.
     */
    async excluirContaDefinitivamente(usuario, { dentroDaTransacao } = {}) {
        const dadosRemovidos = {
            tipoUsuario: usuario.tipoUsuario,
            nome: usuario.nome,
            email: usuario.email
        };

        // Empresa vinculada (se houver): reaproveitada tanto para a
        // limpeza de Storage (logo/capa) quanto para arquivar denúncias
        // pendentes contra a empresa (não só contra o usuário-dono).
        const empresaVinculada =
            usuario.tipoUsuario === "empresa"
                ? await Empresa.findOne({ where: { usuarioId: usuario.id } })
                : null;

        // 1) Limpeza do Storage antes de excluir: best-effort, nunca
        // bloqueia a exclusão da conta (ver `_removerArquivosDoStorage`).
        // Feita fora de qualquer transação de banco: são chamadas de rede
        // ao Supabase Storage, nunca devem segurar uma transação aberta.
        const arquivosDaConta = await this._coletarArquivosDaConta(usuario);
        const relatorioStorage = await this._removerArquivosDoStorage(
            arquivosDaConta,
            usuario.id
        );

        // 2) Exclusão do banco + arquivamento de denúncias pendentes contra
        // a conta, atômicos numa única transação (mesmo padrão de
        // `SessaoService.rotacionar`): se qualquer parte falhar,
        // nada é persistido.
        const transaction = await sequelize.transaction();
        let denunciasArquivadas = 0;

        try {
            // Corrida: duas exclusões da mesma conta ao mesmo tempo (ex.:
            // usuário clica "excluir conta" em duas abas, ou o próprio
            // usuário e um admin simultaneamente); sem isso, a segunda
            // chamada chega até aqui, faz `usuario.destroy()` numa linha
            // que a primeira já apagou (um DELETE sem linhas afetadas não
            // é erro no Postgres/Sequelize) e devolve 200 de novo, como
            // se tivesse excluído algo pela segunda vez. Trava a linha
            // (mesmo padrão de `SessaoService.rotacionar`) e
            // confirma que ainda existe antes de prosseguir: a segunda
            // chamada encontra a linha já removida e recebe um 404 limpo.
            const usuarioTravado = await Usuario.findByPk(usuario.id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!usuarioTravado) {
                throw ErroApi.naoEncontrado("Usuário não encontrado.");
            }

            const entidadeTipoAlvo = usuario.tipoUsuario === "empresa" ? "empresa" : "usuario";
            const entidadeIdAlvo =
                usuario.tipoUsuario === "empresa" ? empresaVinculada?.id : usuario.id;

            if (entidadeIdAlvo) {
                // `denuncias.entidade_id` é polimórfico e sem FK real, de
                // propósito (schema): não é apagado pelo CASCADE. Sem
                // isso, uma denúncia pendente contra a conta excluída
                // ficaria parada na fila de moderação apontando para nada.
                const [linhasAtualizadas] = await Denuncia.update(
                    {
                        status: "arquivada",
                        observacaoAdministrador:
                            "Encerrada automaticamente: a conta denunciada foi excluída."
                    },
                    {
                        where: {
                            entidadeTipo: entidadeTipoAlvo,
                            entidadeId: entidadeIdAlvo,
                            status: { [Op.in]: ["pendente", "em_analise"] }
                        },
                        transaction
                    }
                );
                denunciasArquivadas = linhasAtualizadas;
            }

            // `registros_auditoria` (entradas anteriores sobre esta conta, como um bloqueio),
            // `denuncias.administrador_responsavel_id` (quando esta conta resolveu denúncias como
            // administradora) e `denuncias.denunciante_id` (quando denunciou outra pessoa,
            // não são tocados aqui: sobrevivem com `SET NULL` ou retrato em
            // `metadados`, porque um log de auditoria ou uma denúncia registrada precisa continuar
            // legível depois que a conta deixa de existir. O `usuario.destroy()` abaixo respeita
            // isso pelas FKs do banco.
            await usuarioTravado.destroy({ transaction });

            if (dentroDaTransacao) {
                await dentroDaTransacao({
                    transaction,
                    dadosRemovidos,
                    relatorioStorage,
                    denunciasArquivadas
                });
            }

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        return { dadosRemovidos, relatorioStorage, denunciasArquivadas };
    }

    async removerUsuario(id, { motivo } = {}, solicitante, contexto = {}) {
        const usuario = await this.resolverUsuarioModeravel(id, solicitante, {
            mensagemAutoAcao: "Você não pode excluir a própria conta.",
            mensagemAdminProtegido:
                "Contas administrativas não podem ser excluídas por aqui."
        });

        await this.excluirContaDefinitivamente(usuario, {
            dentroDaTransacao: async ({
                transaction,
                dadosRemovidos,
                relatorioStorage,
                denunciasArquivadas
            }) => {
                await AdminAuditoriaService.registrar(
                    {
                        administradorId: solicitante.id,
                        acao: "excluir_usuario",
                        entidadeTipo: "usuario",
                        entidadeId: id,
                        descricao: `Usuário ${dadosRemovidos.nome} (${dadosRemovidos.email}) foi excluído permanentemente.`,
                        metadados: {
                            usuario: dadosRemovidos,
                            motivo: motivo || null,
                            denunciasArquivadas,
                            storage: {
                                totalArquivos: relatorioStorage.length,
                                falhas: relatorioStorage.filter((r) => !r.sucesso).length
                            }
                        },
                        ip: contexto.ip,
                        userAgent: contexto.userAgent
                    },
                    { transaction }
                );
            }
        });

        return { mensagem: "Usuário removido definitivamente." };
    }
}

export default new AdminUsuarioService();
