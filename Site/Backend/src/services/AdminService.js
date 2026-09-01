import { Op, fn, col, literal } from "sequelize";

import sequelize from "../config/database.js";
import {
    Usuario,
    Empresa,
    Candidato,
    Vaga,
    Candidatura,
    Postagem,
    PostagemAnexo,
    Comentario,
    Curtida,
    Deficiencia,
    CandidatoDeficiencia,
    Denuncia,
    Arquivo
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirAlvoDeAcaoAdministrativa } from "../utils/authorization.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";
import UploadService from "./UploadService.js";
import PostagemService from "./PostagemService.js";

/**
 * Nomes legíveis (singular/plural) por tipo de anexo — só para compor a
 * frase do log de auditoria (Fase 8). Mesmos 3 valores do ENUM de
 * `PostagemAnexo.tipo`.
 */
const NOMES_TIPO_ANEXO = {
    imagem: ["imagem", "imagens"],
    video: ["vídeo", "vídeos"],
    documento: ["documento", "documentos"]
};

const pluralizar = (quantidade, singular, plural) =>
    `${quantidade} ${quantidade === 1 ? singular : plural}`;

/**
 * Monta a descrição em texto corrido do log de "remover postagem"
 * (Fase 8, Parte 15) a partir de um snapshot já capturado ANTES da
 * remoção — nunca reconsulta a postagem (que pode já não existir mais
 * quando o log for lido depois, ver auditoria da Fase 8, item 4).
 * Exemplo: "Pedro Lima removeu uma publicação de João Silva. A
 * publicação continha: texto; 1 imagem; 12 curtidas; 3 comentários."
 */
function descreverRemocaoPostagem(admin, snapshot) {
    const partesConteudo = [];

    if (snapshot.conteudo && snapshot.conteudo.trim()) {
        partesConteudo.push("texto");
    }

    for (const [tipo, quantidade] of Object.entries(snapshot.midiaPorTipo || {})) {
        const [singular, plural] = NOMES_TIPO_ANEXO[tipo] || [tipo, tipo];
        partesConteudo.push(pluralizar(quantidade, singular, plural));
    }

    if (partesConteudo.length === 0) {
        partesConteudo.push("nenhum conteúdo registrado");
    }

    return (
        `${admin.nome} removeu uma publicação de ${snapshot.nomeAutor ?? "um usuário removido"}. ` +
        `A publicação continha: ${partesConteudo.join("; ")}; ` +
        `${pluralizar(snapshot.totalCurtidas, "curtida", "curtidas")}; ` +
        `${pluralizar(snapshot.totalComentarios, "comentário", "comentários")}.`
    );
}

/**
 * Mesma lógica para "remover comentário" — exemplo: "Pedro Lima removeu
 * um comentário de João Silva em uma publicação de Maria Souza."
 */
function descreverRemocaoComentario(admin, snapshot) {
    return (
        `${admin.nome} removeu um comentário de ${snapshot.nomeAutor ?? "um usuário removido"} ` +
        `em uma publicação de ${snapshot.nomeAutorPostagem ?? "um usuário removido"}.`
    );
}

/**
 * Painel administrativo.
 *
 * Todas as rotas que chegam aqui já passaram por authMiddleware +
 * rbacMiddleware("administrador"); ainda assim os métodos nunca
 * confiam em identificadores do corpo da requisição para escalonar
 * privilégios (defesa em profundidade).
 */
class AdminService {
    /* ==========================================================
       EMPRESAS — APROVAÇÃO
    ========================================================== */
    async listarEmpresas(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};

        if (query.status) {
            where.statusAprovacao = query.status;
        }

        const { rows, count } = await Empresa.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "ativo", "bloqueado"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("empresas", rows, count, pagina, limite);
    }

    async avaliarEmpresa(id, { aprovada, motivo }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        const statusAnterior = empresa.statusAprovacao;

        await empresa.update({
            statusAprovacao: aprovada ? "aprovada" : "reprovada",
            motivoReprovacao: aprovada ? null : motivo || null,
            // "Aprovada" (checagem cadastral, libera publicar vaga) e
            // "verificada" (selo de confiança adicional) são conceitos
            // deliberadamente separados agora — aprovar não verifica mais
            // automaticamente. Verificação é uma ação administrativa
            // própria, ver `verificarEmpresa` abaixo.
            avaliadoEm: new Date(),
            avaliadoPor: solicitante.id
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "Sistema",
            titulo: aprovada
                ? "Cadastro aprovado"
                : "Cadastro reprovado",
            descricao: aprovada
                ? "Sua empresa foi aprovada e já pode publicar vagas."
                : `Seu cadastro foi reprovado. Motivo: ${motivo || "não informado"}.`,
            subtipo: aprovada ? "empresa_aprovada" : "empresa_reprovada",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: aprovada ? "APROVAR_EMPRESA" : "REPROVAR_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: aprovada
                ? `Empresa ${empresa.razaoSocial} foi aprovada.`
                : `Empresa ${empresa.razaoSocial} foi reprovada.`,
            metadata: {
                before: { statusAprovacao: statusAnterior },
                after: { statusAprovacao: empresa.statusAprovacao },
                reason: aprovada ? null : motivo || null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    /**
     * Selo de confiança "Empresa verificada" — independente da aprovação
     * cadastral (`statusAprovacao`). Reaproveita o campo `empresaVerificada`
     * que já existe no schema; não precisa de migration. Pode ser
     * concedido ou removido a qualquer momento, em qualquer status de
     * aprovação (uma empresa pode perder a verificação sem deixar de
     * poder publicar vagas, por exemplo).
     */
    async verificarEmpresa(id, { verificada }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        const estadoAnterior = empresa.empresaVerificada;

        await empresa.update({ empresaVerificada: Boolean(verificada) });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: verificada ? "VERIFICAR_EMPRESA" : "REMOVER_VERIFICACAO_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: verificada
                ? `Empresa ${empresa.razaoSocial} recebeu o selo de verificada.`
                : `Selo de verificada removido da empresa ${empresa.razaoSocial}.`,
            metadata: {
                before: { empresaVerificada: estadoAnterior },
                after: { empresaVerificada: empresa.empresaVerificada }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    /**
     * Suspensão/reativação administrativa (Fase G) — ação isolada, sem
     * efeito cascata sobre as vagas da empresa. Usa campos próprios
     * (suspensoPor/suspensoEm/motivoSuspensao), nunca avaliadoPor/
     * avaliadoEm/motivoReprovacao, que continuam representando só a
     * avaliação cadastral inicial.
     */
    async suspenderEmpresa(id, { motivo }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        if (empresa.statusAprovacao !== "aprovada") {
            throw ApiError.conflict(
                "Só é possível suspender uma empresa que esteja aprovada."
            );
        }

        await empresa.update({
            statusAprovacao: "suspensa",
            suspensoPor: solicitante.id,
            suspensoEm: new Date(),
            motivoSuspensao: motivo || null
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "Moderacao",
            titulo: "Empresa suspensa",
            descricao: `Sua empresa foi suspensa pela moderação. Motivo: ${motivo || "não informado"}.`,
            subtipo: "empresa_suspensa",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "SUSPENDER_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: `Empresa ${empresa.razaoSocial} foi suspensa.`,
            metadata: {
                before: { statusAprovacao: "aprovada" },
                after: { statusAprovacao: "suspensa" },
                reason: motivo || null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    async reativarEmpresa(id, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        if (empresa.statusAprovacao !== "suspensa") {
            throw ApiError.conflict(
                "Só é possível reativar uma empresa que esteja suspensa."
            );
        }

        // suspensoPor/suspensoEm/motivoSuspensao NÃO são apagados aqui —
        // ficam como histórico de que a empresa já foi suspensa antes,
        // mesmo padrão de motivoReprovacao sobrevivendo a uma aprovação.
        await empresa.update({ statusAprovacao: "aprovada" });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "Moderacao",
            titulo: "Empresa reativada",
            descricao: "Sua empresa foi reativada pela moderação e voltou a operar normalmente.",
            subtipo: "empresa_reativada",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "REATIVAR_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: `Empresa ${empresa.razaoSocial} foi reativada.`,
            metadata: {
                before: { statusAprovacao: "suspensa" },
                after: { statusAprovacao: "aprovada" }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    /* ==========================================================
       USUÁRIOS — MODERAÇÃO
    ========================================================== */
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
                servico: "AdminService.removerUsuario",
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
                    servico: "AdminService.removerUsuario",
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

    /* ==========================================================
       MODERAÇÃO DE CONTEÚDO
    ========================================================== */
    async listarPostagens(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };

        if (query.q) {
            where.conteudo = { [Op.iLike]: `%${String(query.q).slice(0, 120)}%` };
        }

        const { rows, count } = await Postagem.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "tipoUsuario"]
                },
                // Fase 8: sem isso, `PostagemService.decorar` (via
                // `assinarMidiaDasPostagens`) não acha o anexo
                // correspondente a `imagem` e resolve a privacidade errado
                // — mesmo cuidado já necessário em BuscaService/
                // PublicoService na Fase 7.
                {
                    model: PostagemAnexo,
                    as: "anexos",
                    attributes: ["id", "url", "tipo", "privado", "descricao"],
                    separate: true
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        // Reaproveita a mesma decoração usada no feed (contadores de
        // curtidas/comentários + URLs de mídia assinadas) — nunca duplicar
        // a lógica de Storage aqui (Fase 8, Parte 30: "não recrie a
        // lógica de signed URL"). `solicitante: null` — só afeta
        // `curtidoPorMim`, irrelevante para o painel administrativo.
        const decoradas = await PostagemService.decorar(rows, null);

        return montarResposta("postagens", decoradas, count, pagina, limite);
    }

    async listarComentarios(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };
        if (query.postagemId) where.postagemId = query.postagemId;
        if (query.q) {
            where.comentario = { [Op.iLike]: `%${String(query.q).slice(0, 120)}%` };
        }

        const { rows, count } = await Comentario.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "tipoUsuario"]
                },
                {
                    model: Postagem,
                    as: "postagem",
                    attributes: ["id", "conteudo"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("comentarios", rows, count, pagina, limite);
    }

    /**
     * Remoção idempotente (Fase 8, Parte 11): trava a linha e reconfirma
     * `ativo===true` DENTRO da transação, mesmo padrão de
     * `excluirContaDefinitivamente`. Uma segunda chamada contra a mesma
     * postagem (duplo clique, retry de rede) encontra `ativo:false` e
     * recebe 409 — nunca duplica notificação nem log.
     *
     * O snapshot é capturado ANTES do `update`, dentro da transação, e
     * vai para `metadata.snapshot` — nunca dado pessoal além do nome do
     * autor (sem e-mail/CPF/CNPJ). É a única fonte usada para descrever o
     * log depois, mesmo que a postagem (ou a conta do autor, via CASCADE
     * de `postagens.usuario_id`) deixe de existir no futuro.
     */
    async removerPostagem(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let postagem;

        try {
            postagem = await Postagem.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!postagem) {
                throw ApiError.notFound("Postagem não encontrada.");
            }

            if (!postagem.ativo) {
                throw ApiError.conflict("Esta publicação já foi removida.");
            }

            const [autor, totalCurtidas, totalComentarios, anexos] = await Promise.all([
                Usuario.findByPk(postagem.usuarioId, {
                    attributes: ["id", "nome"],
                    transaction
                }),
                Curtida.count({ where: { postagemId: id }, transaction }),
                Comentario.count({
                    where: { postagemId: id, ativo: true },
                    transaction
                }),
                PostagemAnexo.findAll({
                    where: { postagemId: id },
                    attributes: ["tipo"],
                    transaction
                })
            ]);

            const midiaPorTipo = anexos.reduce((mapa, anexo) => {
                mapa[anexo.tipo] = (mapa[anexo.tipo] || 0) + 1;
                return mapa;
            }, {});

            const snapshot = {
                id: postagem.id,
                autorId: postagem.usuarioId,
                nomeAutor: autor?.nome ?? null,
                conteudo: postagem.conteudo,
                midiaPorTipo,
                totalAnexos: anexos.length,
                totalCurtidas,
                totalComentarios,
                publica: postagem.publica,
                criadaEm: postagem.createdAt
            };

            await postagem.update({ ativo: false }, { transaction });

            await AdminAuditService.log(
                {
                    adminId: solicitante.id,
                    acao: "REMOVER_POSTAGEM",
                    entidadeTipo: "postagem",
                    entidadeId: postagem.id,
                    descricao: descreverRemocaoPostagem(solicitante, snapshot),
                    metadata: {
                        before: { ativo: true },
                        after: { ativo: false },
                        snapshot
                    },
                    ip: contexto.ip,
                    userAgent: contexto.userAgent
                },
                { transaction }
            );

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        // Fora da transação, best-effort — `NotificacaoService.criar` já
        // nunca lança (ver comentário no próprio serviço); uma falha aqui
        // não pode desfazer uma remoção já commitada.
        await NotificacaoService.criar({
            usuarioId: postagem.usuarioId,
            tipo: "Feed",
            titulo: "Publicação removida",
            descricao:
                "Sua publicação foi removida pela moderação por violar as diretrizes da comunidade."
        });

        return { mensagem: "Postagem removida pela moderação." };
    }

    /** Mesmo padrão de `removerPostagem`, ver comentário acima. */
    async removerComentario(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let comentario;

        try {
            comentario = await Comentario.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!comentario) {
                throw ApiError.notFound("Comentário não encontrado.");
            }

            if (!comentario.ativo) {
                throw ApiError.conflict("Este comentário já foi removido.");
            }

            const [autor, postagemRelacionada] = await Promise.all([
                Usuario.findByPk(comentario.usuarioId, {
                    attributes: ["id", "nome"],
                    transaction
                }),
                Postagem.findByPk(comentario.postagemId, {
                    attributes: ["id", "usuarioId"],
                    transaction
                })
            ]);

            const autorPostagem = postagemRelacionada
                ? await Usuario.findByPk(postagemRelacionada.usuarioId, {
                      attributes: ["id", "nome"],
                      transaction
                  })
                : null;

            const snapshot = {
                id: comentario.id,
                autorId: comentario.usuarioId,
                nomeAutor: autor?.nome ?? null,
                conteudo: comentario.comentario,
                postagemId: comentario.postagemId,
                autorPostagemId: postagemRelacionada?.usuarioId ?? null,
                nomeAutorPostagem: autorPostagem?.nome ?? null,
                criadaEm: comentario.createdAt
            };

            await comentario.update({ ativo: false }, { transaction });

            await AdminAuditService.log(
                {
                    adminId: solicitante.id,
                    acao: "REMOVER_COMENTARIO",
                    entidadeTipo: "comentario",
                    entidadeId: comentario.id,
                    descricao: descreverRemocaoComentario(solicitante, snapshot),
                    metadata: {
                        before: { ativo: true },
                        after: { ativo: false },
                        snapshot
                    },
                    ip: contexto.ip,
                    userAgent: contexto.userAgent
                },
                { transaction }
            );

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        await NotificacaoService.criar({
            usuarioId: comentario.usuarioId,
            tipo: "Feed",
            titulo: "Comentário removido",
            descricao: "Seu comentário foi removido pela moderação por violar as diretrizes da comunidade.",
            subtipo: "comentario_removido_moderacao"
        });

        return { mensagem: "Comentário removido pela moderação." };
    }

    async listarVagas(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Vaga.findAndCountAll({
            include: [
                {
                    model: Empresa,
                    as: "empresa",
                    attributes: ["id", "nomeFantasia", "statusAprovacao"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("vagas", rows, count, pagina, limite);
    }

    async alternarVisibilidadeVaga(id, oculta, solicitante, contexto = {}) {
        const vaga = await Vaga.findByPk(id, {
            include: [{ model: Empresa, as: "empresa" }]
        });

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
        }

        const estadoAnterior = { oculta: vaga.oculta };
        const novoOculta = Boolean(oculta);

        await vaga.update({ oculta: novoOculta });

        await NotificacaoService.criar({
            usuarioId: vaga.empresa.usuarioId,
            tipo: "Vaga",
            titulo: novoOculta ? "Vaga ocultada pela moderação" : "Vaga voltou a ficar visível",
            descricao: novoOculta
                ? `Sua vaga "${vaga.titulo}" foi ocultada pela moderação e não aparece mais nas buscas.`
                : `Sua vaga "${vaga.titulo}" voltou a ficar visível para candidatos.`,
            subtipo: novoOculta ? "vaga_oculta_moderacao" : "vaga_reexibida_moderacao",
            entidadeTipo: "vaga",
            entidadeId: vaga.id
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: novoOculta ? "OCULTAR_VAGA" : "REEXIBIR_VAGA",
            entidadeTipo: "vaga",
            entidadeId: vaga.id,
            descricao: novoOculta
                ? `Vaga "${vaga.titulo}" foi ocultada pela moderação.`
                : `Vaga "${vaga.titulo}" voltou a ficar visível.`,
            metadata: {
                before: estadoAnterior,
                after: { oculta: novoOculta }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return { id: vaga.id, oculta: vaga.oculta };
    }

    /* ==========================================================
       RELATÓRIOS
    ========================================================== */
    async relatorios() {
        const [
            totalUsuarios,
            totalCandidatos,
            totalEmpresas,
            empresasPendentes,
            totalVagas,
            vagasAbertas,
            totalCandidaturas,
            totalPostagens,
            usuariosBloqueados
        ] = await Promise.all([
            Usuario.count(),
            Usuario.count({ where: { tipoUsuario: "candidato" } }),
            Usuario.count({ where: { tipoUsuario: "empresa" } }),
            Empresa.count({ where: { statusAprovacao: "pendente" } }),
            Vaga.count(),
            Vaga.count({ where: { status: "Aberta" } }),
            Candidatura.count(),
            Postagem.count({ where: { ativo: true } }),
            Usuario.count({ where: { bloqueado: true } })
        ]);

        const candidaturasPorStatus = await Candidatura.findAll({
            attributes: ["status", [fn("COUNT", col("id")), "total"]],
            group: ["status"]
        });

        const cadastrosPorMes = await Usuario.findAll({
            attributes: [
                [fn("TO_CHAR", col("created_at"), "YYYY-MM"), "mes"],
                [fn("COUNT", col("id")), "total"]
            ],
            where: {
                created_at: {
                    [Op.gte]: literal("NOW() - INTERVAL '12 months'")
                }
            },

            group: [literal("1")],
            order: [literal("1 ASC")]
        });

        const deficienciasMaisComuns = await CandidatoDeficiencia.findAll({
            attributes: [
                "deficienciaId",
                [fn("COUNT", col("CandidatoDeficiencia.id")), "total"]
            ],
            include: [
                {
                    model: Deficiencia,
                    as: "deficiencia",
                    attributes: ["nome", "descricao"]
                }
            ],
            group: ["CandidatoDeficiencia.deficiencia_id", "deficiencia.id"],
            order: [[literal("total"), "DESC"]],
            limit: 10
        });

        const taxaContratacao = await Candidatura.count({
            where: { status: "Aprovada" }
        });

        return {
            totais: {
                usuarios: totalUsuarios,
                candidatos: totalCandidatos,
                empresas: totalEmpresas,
                empresasPendentes,
                vagas: totalVagas,
                vagasAbertas,
                candidaturas: totalCandidaturas,
                postagens: totalPostagens,
                usuariosBloqueados,
                contratacoes: taxaContratacao
            },
            candidaturasPorStatus,
            cadastrosPorMes,
            deficienciasMaisComuns,
            atualizadoEm: new Date().toISOString()
        };
    }
}

export default new AdminService();
