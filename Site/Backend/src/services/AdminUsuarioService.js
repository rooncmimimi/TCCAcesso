import { Op } from "sequelize";

import sequelize from "../config/database.js";
import {
    Usuario,
    Empresa,
    Candidato,
    Postagem,
    PostagemAnexo,
    Denuncia,
    Arquivo
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirAlvoDeAcaoAdministrativa } from "../utils/authorization.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";
import UploadService from "./UploadService.js";
import { avisarPorEmailBestEffort } from "../utils/avisoEmailBestEffort.js";
import { templateContaBloqueada } from "../utils/emailTemplates.js";

/**
 * Painel administrativo — moderação de usuários (bloqueio, exclusão
 * definitiva) e o núcleo de exclusão de conta compartilhado com o
 * self-service (`authService.excluirConta`).
 *
 * Todas as rotas que chegam aqui já passaram por authMiddleware +
 * rbacMiddleware("administrador"); ainda assim os métodos nunca
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
            order: [["created_at", "DESC"]]
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
            throw ApiError.notFound("Usuário não encontrado.");
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
            tipo: "Sistema",
            titulo: novoEstado ? "Conta bloqueada" : "Conta reativada",
            descricao: novoEstado
                ? `Sua conta foi bloqueada. Motivo: ${motivo || "não informado"}.`
                : "Sua conta foi reativada pela moderação.",
            subtipo: novoEstado ? "conta_bloqueada" : "conta_reativada"
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: novoEstado ? "BLOQUEAR_USUARIO" : "REATIVAR_USUARIO",
            entidadeTipo: "usuario",
            entidadeId: usuario.id,
            descricao: novoEstado
                ? `Usuário ${usuario.nome} (${usuario.email}) foi bloqueado.`
                : `Usuário ${usuario.nome} (${usuario.email}) foi reativado.`,
            metadata: {
                before: estadoAnterior,
                after: { bloqueado: novoEstado, ativo: !novoEstado },
                reason: novoEstado ? motivo || null : null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        // Fase 9 (Bloco 3): só no bloqueio, nunca na reativação — quem
        // volta a ter acesso já vai ver a notificação in-app normalmente
        // (o login funciona de novo), diferente de quem acabou de ser
        // bloqueado e não tem mais nenhum jeito de ver um aviso dentro do
        // app. Best-effort, depois de tudo já persistido — uma falha da
        // Brevo nunca desfaz nem atrasa o bloqueio em si.
        if (novoEstado) {
            await avisarPorEmailBestEffort({
                usuarioId: usuario.id,
                email: usuario.email,
                nome: usuario.nome,
                template: templateContaBloqueada({ nome: usuario.nome, motivo: motivo || null }),
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
     * Reúne toda referência a arquivo do Storage pertencente à conta —
     * usada só para saber o que apagar do bucket ANTES de excluir a
     * conta (as linhas do banco em si já são CASCADE, ver removerUsuario).
     *
     * `raw: true` em toda leitura aqui é proposital: foto de
     * perfil/capa/logo/capa de empresa e imagem de postagem/anexo têm
     * getter que resolve para a URL pública final — para remover do
     * bucket precisamos do CAMINHO cru salvo no banco, não da URL
     * resolvida (mesma técnica já usada em UsuarioController ao trocar
     * foto/capa).
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

        // Catálogo geral de uploads (cobre foto/capa/logo já tratados acima
        // de novo — a deduplicação por caminho evita chamada repetida —
        // mais certificados, documentos e postagens que só existem aqui).
        const CATEGORIAS_PRIVADAS = new Set(["curriculo", "certificado", "documento"]);
        const arquivos = await Arquivo.findAll({
            where: { usuarioId: usuario.id },
            attributes: ["categoria", "url"],
            raw: true
        });
        for (const arquivo of arquivos) {
            adicionar(
                arquivo.url,
                CATEGORIAS_PRIVADAS.has(arquivo.categoria),
                `arquivo:${arquivo.categoria}`
            );
        }

        // Imagens de postagem e anexos — cobertos separadamente porque nem
        // toda imagem de postagem necessariamente passa pelo catálogo
        // `arquivos` (o campo `imagem` da própria postagem é escrito à
        // parte, ver PostagemController).
        //
        // Fase 7: anexo de postagem passou a poder estar no bucket
        // PRIVADO (`privado=true`) — remover do bucket errado falha
        // silenciosamente (best-effort) e o arquivo vira órfão pra
        // sempre. `postagens.imagem` não tem coluna própria de
        // privacidade (nunca diverge do anexo cujo caminho é igual —
        // ver migration 0039): resolve pelo anexo correspondente.
        const postagens = await Postagem.findAll({
            where: { usuarioId: usuario.id },
            attributes: ["id", "imagem"],
            raw: true
        });

        let anexos = [];
        if (postagens.length > 0) {
            anexos = await PostagemAnexo.findAll({
                where: { postagemId: postagens.map((p) => p.id) },
                attributes: ["id", "url", "privado"],
                raw: true
            });
            for (const anexo of anexos) {
                adicionar(anexo.url, anexo.privado, `postagem_anexo:${anexo.id}`);
            }
        }

        for (const postagem of postagens) {
            const anexoCorrespondente = anexos.find((anexo) => anexo.url === postagem.imagem);
            adicionar(
                postagem.imagem,
                anexoCorrespondente?.privado ?? false,
                `postagem:${postagem.id}.imagem`
            );
        }

        return itens;
    }

    /**
     * Remove do Storage os arquivos coletados por `_coletarArquivosDaConta`.
     * Best-effort e nunca lança: uma falha aqui não pode impedir a
     * exclusão da conta (mesmo princípio já usado em
     * `NotificacaoService.criar` — infraestrutura secundária nunca
     * derruba a ação principal). Cada item é logado individualmente
     * (sucesso ou falha, com motivo) para permitir limpeza manual
     * posterior de qualquer blob que não tenha sido removido.
     */
    async _removerArquivosDoStorage(itens, usuarioId) {
        const resultados = await Promise.allSettled(
            itens.map((item) =>
                UploadService.removerArquivoFisico(item.caminho, {
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
     * Núcleo da exclusão DEFINITIVA de uma conta — limpeza do Storage +
     * arquivamento de denúncias pendentes contra a conta + `destroy()`,
     * tudo atômico. Compartilhado pelos dois caminhos ativos de exclusão
     * (Fase 5): `removerUsuario` (administrador, abaixo) e
     * `authService.excluirConta` (o próprio usuário) — antes desta
     * extração, o caminho self-service tinha uma implementação própria,
     * mais simples, que não limpava Storage nem arquivava denúncias.
     * Nenhum outro lugar deve reimplementar esta lógica.
     *
     * Autorização e log de auditoria são responsabilidade de QUEM CHAMA:
     * este método não decide se a ação é permitida (isso já aconteceu
     * antes, via senha atual ou `garantirAlvoDeAcaoAdministrativa`), e só
     * cria log de auditoria se o chamador pedir via `dentroDaTransacao`
     * (só faz sentido para a ação administrativa — exclusão pelo próprio
     * usuário não é uma "ação administrativa" a ser auditada como tal).
     *
     * `dentroDaTransacao`, se fornecido, roda ANTES do commit, na MESMA
     * transação do `destroy()` — preserva a atomicidade original entre
     * "conta excluída" e "log de auditoria escrito" (uma falha no log
     * desfaz a exclusão inteira, nunca deixa a conta excluída sem log).
     */
    async excluirContaDefinitivamente(usuario, { dentroDaTransacao } = {}) {
        const dadosRemovidos = {
            tipoUsuario: usuario.tipoUsuario,
            nome: usuario.nome,
            email: usuario.email
        };

        // Empresa vinculada (se houver) — reaproveitada tanto para a
        // limpeza de Storage (logo/capa) quanto para arquivar denúncias
        // pendentes contra a EMPRESA (não só contra o usuário-dono).
        const empresaVinculada =
            usuario.tipoUsuario === "empresa"
                ? await Empresa.findOne({ where: { usuarioId: usuario.id } })
                : null;

        // 1) Limpeza do Storage ANTES de excluir — best-effort, nunca
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
        // `RefreshTokenService.rotacionar`): se qualquer parte falhar,
        // nada é persistido.
        const transaction = await sequelize.transaction();
        let denunciasArquivadas = 0;

        try {
            // Corrida: duas exclusões da MESMA conta ao mesmo tempo (ex.:
            // usuário clica "excluir conta" em duas abas, ou o próprio
            // usuário e um admin simultaneamente) — sem isso, a segunda
            // chamada chega até aqui, faz `usuario.destroy()` numa linha
            // que a primeira já apagou (um DELETE sem linhas afetadas não
            // é erro no Postgres/Sequelize) e devolve 200 de novo, como
            // se tivesse excluído algo pela segunda vez. Trava a linha
            // (mesmo padrão de `RefreshTokenService.rotacionar`) e
            // confirma que ainda existe antes de prosseguir — a segunda
            // chamada encontra a linha já removida e recebe um 404 limpo.
            const usuarioTravado = await Usuario.findByPk(usuario.id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!usuarioTravado) {
                throw ApiError.notFound("Usuário não encontrado.");
            }

            const entidadeTipoAlvo = usuario.tipoUsuario === "empresa" ? "empresa" : "usuario";
            const entidadeIdAlvo =
                usuario.tipoUsuario === "empresa" ? empresaVinculada?.id : usuario.id;

            if (entidadeIdAlvo) {
                // `denuncias.entidade_id` é polimórfico e sem FK real, de
                // propósito (schema) — não é apagado pelo CASCADE. Sem
                // isso, uma denúncia pendente contra a conta excluída
                // ficaria parada na fila de moderação apontando para nada.
                const [linhasAtualizadas] = await Denuncia.update(
                    {
                        status: "arquivada",
                        observacaoAdmin:
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

            // `admin_audit_logs` (entradas PASSADAS sobre esta conta, ex.:
            // um bloqueio anterior), `denuncias.admin_responsavel_id`
            // (quando esta conta já atuou como admin resolvendo uma
            // denúncia) e `denuncias.denunciante_id` (quando esta conta
            // denunciou outra pessoa — Fase 5, migration 0036) são
            // deliberadamente NÃO tocados aqui — sobrevivem com
            // `SET NULL`/snapshot em `metadata`, porque um log de
            // auditoria (ou uma denúncia já registrada) precisa continuar
            // legível mesmo depois que a conta que ele descreve deixa de
            // existir. `usuario.destroy()` abaixo já respeita isso via as
            // FKs do próprio banco.
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
                await AdminAuditService.log(
                    {
                        adminId: solicitante.id,
                        acao: "EXCLUIR_USUARIO",
                        entidadeTipo: "usuario",
                        entidadeId: id,
                        descricao: `Usuário ${dadosRemovidos.nome} (${dadosRemovidos.email}) foi excluído permanentemente.`,
                        metadata: {
                            usuario: dadosRemovidos,
                            reason: motivo || null,
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
