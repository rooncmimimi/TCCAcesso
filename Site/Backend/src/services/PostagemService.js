import { Op } from "sequelize";

import sequelize from "../config/database.js";
import env from "../config/env.js";
import {
    Postagem,
    Usuario,
    Comentario,
    Curtida,
    PostagemAnexo,
    Compartilhamento,
    UsuarioSeguido
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, garantirEmpresaAprovadaSeForEmpresa, ehAdministrador } from "../utils/authorization.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";
import SeguidorService from "./SeguidorService.js";
import BloqueioService from "./BloqueioService.js";
import UploadService from "./UploadService.js";
import { emitirFeed } from "../realtime/socket.js";
import { urlPublica, tipoDoArquivo } from "../middlewares/uploadMiddleware.js";
import { resolverUrlExibicao, gerarUrlAssinada, gerarUrlsAssinadas } from "../utils/supabaseStorage.js";

/**
 * Etapa 4 (auditoria de robustez do upload) — compensação explícita:
 * Supabase Storage e PostgreSQL não compartilham uma transaction, então
 * uma falha em `Postagem.create`/`PostagemAnexo.bulkCreate` DEPOIS que
 * `processarAnexosPostagem` (uploadMiddleware.js) já enviou os anexos ao
 * Storage deixaria esses arquivos órfãos — nenhuma linha no banco chega a
 * referenciá-los, já que a transaction inteira foi desfeita. Só é chamada
 * quando `arquivos` não está vazio; percorre exatamente os arquivos desta
 * requisição (nunca de outra postagem/usuário). Reaproveita
 * `UploadService.removerArquivoFisico`, o mesmo mecanismo já usado em
 * troca de foto/capa/logo/currículo — não um segundo mecanismo de limpeza.
 * Best-effort: uma falha ao limpar nunca substitui o erro original.
 */
async function limparAnexosDaOperacao(arquivos) {
    if (!arquivos || arquivos.length === 0) return;

    const resultados = await Promise.allSettled(
        arquivos.map((arquivo) =>
            UploadService.removerArquivoFisico(urlPublica(arquivo), { privado: true })
        )
    );

    const falhas = resultados.filter(
        (r) => r.status === "rejected" || r.value === false
    ).length;

    if (falhas > 0) {
        console.error(
            JSON.stringify({
                nivel: "error",
                servico: "PostagemService.create",
                etapa: "limpeza_apos_falha_no_banco",
                totalArquivos: arquivos.length,
                falhas
            })
        );
    }
}

/**
 * Autor da postagem inclui `perfilPublico`/`tipoUsuario` só para a
 * checagem de acesso a conteúdo privado (Fase 3) — nunca exposto na
 * resposta (o `attributes` de `incluirAutor()` já limita o que sai).
 * Escopo: só usuário/candidato — empresa mantém o comportamento de
 * sempre visível (seguidor de empresa é outra tabela, `EmpresaSeguida`,
 * sem conceito de solicitação/aprovação nesta fase).
 */
export async function garantirAcessoAPostagem(postagem, solicitante) {
    const usuarioId = postagem.usuarioId;

    // Fase 9 (Bloco 2): bloqueio tem prioridade sobre QUALQUER outra regra
    // de visibilidade — mesmo autor público ou empresa (que abaixo saem
    // sem mais checagem nenhuma) continua indisponível para quem tem
    // bloqueio com ele, nos dois sentidos. Administrador nunca é afetado
    // por bloqueio (mesma convenção de `BloqueioService.garantirNaoBloqueado`).
    // Mensagem genérica de propósito — nunca revela que o motivo é bloqueio,
    // mesmo padrão já usado em `BloqueioService`.
    if (
        solicitante &&
        String(solicitante.id) !== String(usuarioId) &&
        !ehAdministrador(solicitante)
    ) {
        const bloqueado = await BloqueioService.estaBloqueadoEntre(
            solicitante.id,
            usuarioId
        );

        if (bloqueado) {
            throw ApiError.forbidden("Esta publicação não está disponível.");
        }
    }

    const autor = await Usuario.findByPk(usuarioId, {
        attributes: ["perfilPublico", "tipoUsuario"]
    });

    if (!autor || autor.tipoUsuario === "empresa" || autor.perfilPublico) {
        return;
    }

    const autorizado = await SeguidorService.podeVerConteudoPrivado(usuarioId, solicitante);

    if (!autorizado) {
        throw ApiError.forbidden(
            "Este perfil é privado. Siga para ver as publicações."
        );
    }
}

/**
 * Fase 7 — substitui os CAMINHOS crus de `imagem`/`anexos[].url` por URLs
 * de exibição, SEMPRE depois de `garantirAcessoAPostagem` (ou o filtro
 * SQL equivalente de `findAll`) já ter aprovado cada postagem recebida
 * aqui — nunca chamar isto antes da autorização. Reaproveitada por todo
 * lugar que serializa postagem pra fora (`PostagemService.decorar`,
 * `CompartilhamentoService`, `BuscaService`, `PublicoService.home`) —
 * nunca duplicar esta lógica.
 *
 * Anexo com `privado=false` (legado, ou caminho `/uploads/`/URL completa
 * antiga) resolve de graça via `resolverUrlExibicao` (bucket público,
 * sem chamada de rede). Anexo com `privado=true` (todo upload novo desde
 * a Fase 7) exige URL assinada — geradas em LOTE, agrupadas por TTL, no
 * máximo 2 chamadas ao Supabase por página inteira (uma pra autores
 * público/empresa — TTL longo, outra pra autores privados — TTL curto),
 * nunca uma chamada por imagem.
 *
 * Muta e devolve a MESMA lista recebida (objetos já "planos", pós
 * `.toJSON()` — nunca instâncias do Sequelize).
 */
export async function assinarMidiaDasPostagens(postagensPlanas) {
    const lista = Array.isArray(postagensPlanas) ? postagensPlanas : [postagensPlanas];

    if (lista.length === 0) {
        return lista;
    }

    const idsAutores = [...new Set(lista.map((p) => p.usuarioId).filter(Boolean))];

    const autores = idsAutores.length
        ? await Usuario.findAll({
              where: { id: { [Op.in]: idsAutores } },
              attributes: ["id", "perfilPublico", "tipoUsuario"]
          })
        : [];

    const autorPorId = new Map(autores.map((autor) => [String(autor.id), autor]));

    const ttlDoAutor = (usuarioId) => {
        const autor = autorPorId.get(String(usuarioId));
        const publico = !autor || autor.tipoUsuario === "empresa" || autor.perfilPublico;

        return publico
            ? env.storage.signedUrlPublicExpiresSeconds
            : env.storage.signedUrlExpiresSeconds;
    };

    // Agrupa por TTL (não por postagem/anexo) — uma chamada em lote por
    // grupo, independente de quantas postagens/anexos existirem na página.
    const grupos = new Map();

    const registrarParaAssinar = (caminho, ttl, aplicar) => {
        if (!grupos.has(ttl)) {
            grupos.set(ttl, { caminhos: [], aplicar: [] });
        }

        const grupo = grupos.get(ttl);
        grupo.caminhos.push(caminho);
        grupo.aplicar.push(aplicar);
    };

    for (const postagem of lista) {
        const ttl = ttlDoAutor(postagem.usuarioId);
        const anexos = Array.isArray(postagem.anexos) ? postagem.anexos : [];

        // `imagem` (campo legado) nunca tem privacidade própria — é
        // sempre uma cópia do caminho de um anexo já existente (mesmo
        // array de arquivos, mesma requisição, nunca editado depois — ver
        // migration 0039). Resolve pelo anexo cujo caminho bate.
        if (postagem.imagem) {
            const anexoCorrespondente = anexos.find(
                (anexo) => anexo.url === postagem.imagem
            );

            if (anexoCorrespondente?.privado) {
                registrarParaAssinar(postagem.imagem, ttl, (url) => {
                    postagem.imagem = url;
                });
            } else {
                postagem.imagem = resolverUrlExibicao(postagem.imagem);
            }
        }

        for (const anexo of anexos) {
            if (!anexo.url) continue;

            if (anexo.privado) {
                registrarParaAssinar(anexo.url, ttl, (url) => {
                    anexo.url = url;
                });
            } else {
                anexo.url = resolverUrlExibicao(anexo.url);
            }
        }
    }

    for (const [ttl, grupo] of grupos) {
        // eslint-disable-next-line no-await-in-loop
        const resultados = await gerarUrlsAssinadas(grupo.caminhos, {
            expiresIn: ttl
        });

        resultados.forEach((resultado, indice) => {
            grupo.aplicar[indice](resultado?.url ?? null);
        });
    }

    return lista;
}

/**
 * O Sequelize muta os objetos de `include` (grava associação/alias neles),
 * portanto o MESMO objeto não pode ser reutilizado em níveis diferentes de
 * aninhamento — isso gerava SQL inválido ("missing FROM-clause entry").
 * Por isso cada include é criado por uma fábrica que devolve um objeto novo.
 */
const incluirAutor = () => ({
    model: Usuario,
    as: "usuario",
    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
});

const incluirAnexos = () => ({
    model: PostagemAnexo,
    as: "anexos",
    separate: true,
    order: [["ordem", "ASC"]]
});

class PostagemService {
    async buscarAtiva(id, transaction, solicitante) {
        const postagem = await Postagem.findByPk(id, { transaction });

        if (!postagem || !postagem.ativo) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        if (solicitante !== undefined) {
            // Ponto único usado por editar, remover, curtir, comentar e
            // gerar URL de anexo — empresa pendente/reprovada/suspensa não
            // interage com NENHUMA postagem por nenhuma dessas vias, sem
            // duplicar a checagem em cada método.
            await garantirEmpresaAprovadaSeForEmpresa(solicitante);
            await garantirAcessoAPostagem(postagem, solicitante);
        }

        return postagem;
    }

    /**
     * Contadores reais (curtidas, comentários, compartilhamentos) e o
     * estado do usuário autenticado para cada postagem.
     */
    async decorar(postagens, solicitante) {
        const lista = Array.isArray(postagens) ? postagens : [postagens];

        if (lista.length === 0) {
            return [];
        }

        const ids = lista.map((item) => item.id);

        const [curtidas, comentarios, compartilhamentos] = await Promise.all([
            Curtida.findAll({
                where: { postagemId: { [Op.in]: ids } },
                attributes: ["postagemId", "usuarioId"]
            }),
            Comentario.count({
                where: { postagemId: { [Op.in]: ids }, ativo: true },
                group: ["postagem_id"]
            }),
            Compartilhamento.count({
                where: { postagemId: { [Op.in]: ids } },
                group: ["postagem_id"]
            })
        ]);

        const mapaContagem = (linhas) => {
            const mapa = new Map();

            (linhas || []).forEach((linha) => {
                mapa.set(
                    linha.postagem_id || linha.postagemId,
                    Number(linha.count)
                );
            });

            return mapa;
        };

        const totalComentarios = mapaContagem(comentarios);
        const totalCompartilhamentos = mapaContagem(compartilhamentos);

        const decoradas = lista.map((postagem) => {
            const dados = postagem.toJSON ? postagem.toJSON() : postagem;

            const curtidasDaPostagem = curtidas.filter(
                (curtida) => String(curtida.postagemId) === String(dados.id)
            );

            return {
                ...dados,
                totalCurtidas: curtidasDaPostagem.length,
                curtidoPorMim: solicitante
                    ? curtidasDaPostagem.some(
                          (curtida) =>
                              String(curtida.usuarioId) ===
                              String(solicitante.id)
                      )
                    : false,
                totalComentarios: totalComentarios.get(dados.id) || 0,
                totalCompartilhamentos:
                    totalCompartilhamentos.get(dados.id) || 0
            };
        });

        // Fase 7: chamado por ÚLTIMO, depois que toda postagem já passou
        // pela autorização (garantirAcessoAPostagem ou o filtro SQL de
        // findAll) — nunca antes.
        return assinarMidiaDasPostagens(decoradas);
    }

    /* ==========================================================
       FEED (autenticado) — prioriza quem o usuário segue
    ========================================================== */
    async findAll(query, solicitante) {
        // Empresa pendente/reprovada/suspensa não acessa o feed (nem o
        // geral, nem a aba "Publicações" de outro perfil) — mesma
        // autoridade central de `garantirEmpresaAprovada`, nunca uma
        // segunda regra. Nunca afeta candidato/administrador.
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };

        if (query.usuarioId) {
            // Aba "Publicações" de um perfil específico (Fase 3): se o autor
            // for privado e o solicitante não tiver acesso (dono, admin ou
            // seguidor aprovado), a lista inteira é negada — nunca filtrada
            // em silêncio, pra mensagem "este perfil é privado" aparecer.
            await garantirAcessoAPostagem(
                { usuarioId: query.usuarioId },
                solicitante
            );

            where.usuarioId = query.usuarioId;
        }

        if (query.escopo === "seguindo" && solicitante) {
            const vinculos = await UsuarioSeguido.findAll({
                where: { seguidorId: solicitante.id },
                attributes: ["seguidoId"]
            });

            where.usuarioId = {
                [Op.in]: [
                    ...vinculos.map((item) => item.seguidoId),
                    solicitante.id
                ]
            };
        }

        // Feed geral/misto (sem filtro por autor nem por "seguindo"): uma
        // postagem de autor com perfil privado só entra se o solicitante já
        // for seguidor aprovado (ou o próprio autor) — filtrado no SQL, não
        // confia no cliente para esconder. Empresa nunca é filtrada (fora
        // do escopo da Fase 3); admin sempre vê tudo (convenção já usada em
        // outros services).
        if (
            !query.usuarioId &&
            query.escopo !== "seguindo" &&
            solicitante &&
            !ehAdministrador(solicitante)
        ) {
            const [idsSeguidos, idsBloqueados] = await Promise.all([
                SeguidorService.idsSeguidos(solicitante.id),
                // Fase 9 (Bloco 2): feed geral nunca lista postagem de quem
                // tem bloqueio com o solicitante, em nenhum sentido — sem
                // isso, autor de perfil público (o caso comum, que sai sem
                // checagem nenhuma logo abaixo) continuava aparecendo pra
                // quem bloqueou/foi bloqueado por ele. Mesmo helper já
                // usado por BuscaService/UsuarioService pra excluir de
                // listas sociais.
                BloqueioService.idsRelacionados(solicitante.id)
            ]);

            where[Op.and] = [
                {
                    [Op.or]: [
                        { "$usuario.perfil_publico$": true },
                        { "$usuario.tipo_usuario$": "empresa" },
                        {
                            usuarioId: {
                                [Op.in]: [...idsSeguidos, solicitante.id]
                            }
                        }
                    ]
                },
                ...(idsBloqueados.length
                    ? [{ usuarioId: { [Op.notIn]: idsBloqueados } }]
                    : [])
            ];
        }

        if (query.q) {
            where.conteudo = {
                [Op.iLike]: `%${String(query.q).slice(0, 120)}%`
            };
        }

        const { rows, count } = await Postagem.findAndCountAll({
            where,
            include: [incluirAutor(), incluirAnexos()],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        const postagens = await this.decorar(rows, solicitante);

        return montarResposta("postagens", postagens, count, pagina, limite);
    }

    /* ==========================================================
       DETALHE COM COMENTÁRIOS EM ÁRVORE
    ========================================================== */
    async findById(id, solicitante = null) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const postagem = await Postagem.findOne({
            where: { id, ativo: true },
            include: [
                incluirAutor(),
                incluirAnexos(),
                {
                    model: Comentario,
                    as: "comentarios",
                    where: { ativo: true, comentarioPaiId: null },
                    required: false,
                    include: [
                        incluirAutor(),
                        {
                            model: Comentario,
                            as: "respostas",
                            required: false,
                            where: { ativo: true },
                            include: [incluirAutor()]
                        }
                    ]
                }
            ],
            order: [[{ model: Comentario, as: "comentarios" }, "created_at", "ASC"]]
        });

        if (!postagem) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        await garantirAcessoAPostagem(postagem, solicitante);

        const [decorada] = await this.decorar(postagem, solicitante);

        return decorada;
    }

    /**
     * `bruto` é a string JSON enviada pelo cliente (`descricoesAnexos`,
     * uma por posição de arquivo). Nunca confia no formato do cliente:
     * qualquer coisa que não seja um array de strings vira lista vazia
     * silenciosamente (a publicação nunca falha por causa de descrição
     * malformada — o pior caso é o anexo nascer sem descrição).
     */
    parseDescricoesAnexos(bruto) {
        if (!bruto) return [];

        try {
            const lista = JSON.parse(bruto);

            if (!Array.isArray(lista)) return [];

            return lista.map((item) =>
                typeof item === "string" ? item.trim().slice(0, 500) || null : null
            );
        } catch {
            return [];
        }
    }

    /* ==========================================================
       CRIAR (texto + até 4 anexos)
    ========================================================== */
    async create(data, solicitante, arquivos = []) {
        const conteudo = String(data.conteudo || "").trim();

        if (!conteudo && arquivos.length === 0) {
            throw ApiError.badRequest(
                "Escreva algo ou anexe um arquivo para publicar."
            );
        }

        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const transaction = await sequelize.transaction();

        let postagem;

        try {
            const primeiraImagem = arquivos.find(
                (arquivo) => tipoDoArquivo(arquivo) === "imagem"
            );

            postagem = await Postagem.create(
                {
                    usuarioId: solicitante.id,
                    conteudo,
                    imagem: primeiraImagem ? urlPublica(primeiraImagem) : null,
                    publica: data.publica === undefined ? true : Boolean(data.publica)
                },
                { transaction }
            );

            if (arquivos.length > 0) {
                const descricoes = this.parseDescricoesAnexos(data.descricoesAnexos);

                await PostagemAnexo.bulkCreate(
                    arquivos.map((arquivo, indice) => ({
                        postagemId: postagem.id,
                        tipo: tipoDoArquivo(arquivo),
                        url: urlPublica(arquivo),
                        // Fase 7: todo anexo novo nasce no bucket privado —
                        // reflete o que `processarAnexosPostagem` (rota)
                        // já faz de verdade no Storage (privado: true).
                        privado: true,
                        nomeOriginal: arquivo.originalname?.slice(0, 255),
                        mimeType: arquivo.mimetype,
                        tamanhoBytes: arquivo.size,
                        ordem: indice,
                        descricao: descricoes[indice] || null
                    })),
                    { transaction }
                );
            }

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            await limparAnexosDaOperacao(arquivos);
            throw erro;
        }

        // Fora da transação: uma falha aqui não pode disparar rollback
        // de uma transação já confirmada.
        const criada = await this.findById(postagem.id, solicitante);

        // Nunca inclua o objeto de domínio completo aqui — ver o comentário
        // de segurança em `realtime/socket.js` sobre `emitirFeed`. O cliente
        // revalida via REST, que já aplica `garantirAcessoAPostagem`.
        emitirFeed("feed:postagem", { id: criada.id, criada: true });

        return criada;
    }



    /* ==========================================================
       ATUALIZAR (autor ou admin)
    ========================================================== */
    async update(id, data, solicitante) {
        const postagem = await this.buscarAtiva(id, undefined, solicitante);

        garantirDono(solicitante, postagem.usuarioId);

        await postagem.update({
            conteudo: data.conteudo ?? postagem.conteudo,
            publica:
                data.publica === undefined
                    ? postagem.publica
                    : Boolean(data.publica),
            editadoEm: new Date()
        });

        const atualizada = await this.findById(id, solicitante);

        // Nunca inclua o objeto de domínio completo aqui — mesma regra de
        // `create()` acima.
        emitirFeed("feed:postagem", { id: atualizada.id, atualizada: true });

        return atualizada;
    }

    /**
     * Edita SÓ a descrição acessível de um anexo já publicado — nunca o
     * arquivo em si (trocar a imagem/vídeo exigiria um novo upload, fora
     * do escopo desta ação). Mesma autorização de dono que `update`.
     */
    async atualizarDescricaoAnexo(postagemId, anexoId, descricao, solicitante) {
        const postagem = await this.buscarAtiva(postagemId, undefined, solicitante);

        garantirDono(solicitante, postagem.usuarioId);

        const anexo = await PostagemAnexo.findOne({
            where: { id: anexoId, postagemId }
        });

        if (!anexo) {
            throw ApiError.notFound("Anexo não encontrado nesta publicação.");
        }

        const descricaoLimpa = descricao == null ? null : String(descricao).trim().slice(0, 500) || null;

        await anexo.update({ descricao: descricaoLimpa });

        const atualizada = await this.findById(postagemId, solicitante);

        // Nunca inclua o objeto de domínio completo aqui — mesma regra de
        // `create()` acima.
        emitirFeed("feed:postagem", { id: atualizada.id, atualizada: true });

        return atualizada;
    }

    /**
     * Fase 7 — única forma de obter uma URL utilizável de um anexo
     * específico (exibição inline OU download). Reautoriza do ZERO via
     * `garantirAcessoAPostagem` a cada chamada — nunca reaproveita uma
     * URL/aprovação anterior. `anexoId` é sempre resolvido escopado por
     * `postagemId` junto (nunca `findByPk(anexoId)` sozinho) — fecha o
     * IDOR de trocar o `anexoId` por um de outra publicação enquanto
     * mantém um `postagemId` autorizado na URL.
     */
    async gerarUrlAnexo(postagemId, anexoId, solicitante, { baixar = false } = {}) {
        const postagem = await this.buscarAtiva(postagemId, undefined, solicitante);

        const anexo = await PostagemAnexo.findOne({
            where: { id: anexoId, postagemId }
        });

        if (!anexo) {
            throw ApiError.notFound("Anexo não encontrado nesta publicação.");
        }

        // Anexo legado (bucket público, `privado=false`) — resolve de
        // graça, sem assinatura (não há o que expirar).
        if (!anexo.privado) {
            return { url: resolverUrlExibicao(anexo.url), expiraEm: null };
        }

        const autor = await Usuario.findByPk(postagem.usuarioId, {
            attributes: ["perfilPublico", "tipoUsuario"]
        });
        const publico = !autor || autor.tipoUsuario === "empresa" || autor.perfilPublico;

        // Download é sempre de curta duração, mesmo pra autor
        // público/empresa — é uma ação pontual, não uma URL embutida
        // numa página que fica aberta por horas.
        const validade = baixar
            ? env.storage.signedUrlExpiresSeconds
            : publico
              ? env.storage.signedUrlPublicExpiresSeconds
              : env.storage.signedUrlExpiresSeconds;

        const opcoes = { expiresIn: validade };
        if (baixar) {
            opcoes.download = anexo.nomeOriginal || true;
        }

        const resultado = await gerarUrlAssinada(anexo.url, opcoes);

        if (!resultado) {
            throw ApiError.notFound("Não foi possível gerar acesso a este arquivo.");
        }

        return { url: resultado.url, expiraEm: resultado.expiraEm };
    }

    /* ==========================================================
       REMOVER (soft delete via coluna "ativo")
    ========================================================== */
    async delete(id, solicitante, contexto = {}) {
        const postagem = await this.buscarAtiva(id, undefined, solicitante);

        garantirDono(solicitante, postagem.usuarioId);

        const ehModeracao =
            ehAdministrador(solicitante) &&
            String(postagem.usuarioId) !== String(solicitante.id);

        postagem.ativo = false;
        await postagem.save();

        emitirFeed("feed:postagem", { id, removida: true });

        if (ehModeracao) {
            await NotificacaoService.criar({
                usuarioId: postagem.usuarioId,
                tipo: "Feed",
                titulo: "Publicação removida",
                descricao: "Sua publicação foi removida pela moderação por violar as diretrizes da comunidade.",
                subtipo: "postagem_removida_moderacao"
            });

            await AdminAuditService.log({
                adminId: solicitante.id,
                acao: "REMOVER_POSTAGEM",
                entidadeTipo: "postagem",
                entidadeId: postagem.id,
                descricao: "Postagem removida pela moderação.",
                metadata: {
                    before: { ativo: true },
                    after: { ativo: false },
                    autorId: postagem.usuarioId
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return { mensagem: "Postagem removida com sucesso." };
    }

    /* ==========================================================
       CURTIR / DESCURTIR (toggle idempotente)
    ========================================================== */
    async alternarCurtida(id, solicitante) {
        const postagem = await this.buscarAtiva(id, undefined, solicitante);

        const existente = await Curtida.findOne({
            where: { postagemId: id, usuarioId: solicitante.id }
        });

        if (existente) {
            await existente.destroy();
        } else {
            await Curtida.create({
                postagemId: id,
                usuarioId: solicitante.id
            });

            if (String(postagem.usuarioId) !== String(solicitante.id)) {
                await NotificacaoService.criar({
                    usuarioId: postagem.usuarioId,
                    tipo: "Feed",
                    titulo: "Nova curtida na sua publicação",
                    descricao: `${solicitante.nome} curtiu sua publicação.`,
                    subtipo: "curtida_postagem",
                    entidadeTipo: "postagem",
                    entidadeId: postagem.id,
                    atorId: solicitante.id
                });
            }
        }

        const total = await Curtida.count({ where: { postagemId: id } });

        emitirFeed("feed:curtida", {
            postagemId: id,
            totalCurtidas: total
        });

        return { curtido: !existente, totalCurtidas: total };
    }

    /* ==========================================================
       COMENTÁRIOS
    ========================================================== */
    async comentar(id, comentario, solicitante, comentarioPaiId = null) {
        const postagem = await this.buscarAtiva(id, undefined, solicitante);
        let pai = null;

        if (comentarioPaiId) {
            pai = await Comentario.findByPk(comentarioPaiId);

            if (!pai || !pai.ativo || String(pai.postagemId) !== String(id)) {
                throw ApiError.notFound("Comentário respondido não encontrado.");
            }
        }

        const criado = await Comentario.create({
            postagemId: id,
            usuarioId: solicitante.id,
            comentario,
            comentarioPaiId
        });

        const previa = String(comentario).slice(0, 120);

        if (String(postagem.usuarioId) !== String(solicitante.id)) {
            await NotificacaoService.criar({
                usuarioId: postagem.usuarioId,
                tipo: "Feed",
                titulo: "Novo comentário na sua publicação",
                descricao: `${solicitante.nome} comentou: ${previa}`,
                subtipo: "comentario_postagem",
                entidadeTipo: "postagem",
                entidadeId: postagem.id,
                atorId: solicitante.id
            });
        }

        // Resposta a um comentário: avisa o autor do comentário-pai
        // também, à parte do dono da postagem — exceto se for a mesma
        // pessoa (já notificada acima) ou a própria pessoa respondendo
        // ao próprio comentário (não faz sentido se auto-notificar).
        if (
            pai &&
            String(pai.usuarioId) !== String(solicitante.id) &&
            String(pai.usuarioId) !== String(postagem.usuarioId)
        ) {
            await NotificacaoService.criar({
                usuarioId: pai.usuarioId,
                tipo: "Feed",
                titulo: "Responderam ao seu comentário",
                descricao: `${solicitante.nome} respondeu ao seu comentário: ${previa}`,
                subtipo: "resposta_comentario",
                entidadeTipo: "postagem",
                entidadeId: postagem.id,
                atorId: solicitante.id
            });
        }

        const total = await Comentario.count({
            where: { postagemId: id, ativo: true }
        });

        const completo = await Comentario.findByPk(criado.id, {
            include: [incluirAutor()]
        });

        // Nunca inclua o comentário completo aqui (autor + texto) — mesma
        // regra de `create()`/`update()` acima: o cliente já ignora este
        // campo hoje e revalida `["comentarios", postagemId]` via REST.
        emitirFeed("feed:comentario", {
            postagemId: id,
            totalComentarios: total
        });

        return completo;
    }

    async removerComentario(comentarioId, solicitante, contexto = {}) {
        const comentario = await Comentario.findByPk(comentarioId);

        if (!comentario || !comentario.ativo) {
            throw ApiError.notFound("Comentário não encontrado.");
        }

        garantirDono(solicitante, comentario.usuarioId);

        const ehModeracao =
            ehAdministrador(solicitante) &&
            String(comentario.usuarioId) !== String(solicitante.id);

        comentario.ativo = false;
        await comentario.save();

        emitirFeed("feed:comentario", {
            postagemId: comentario.postagemId,
            comentarioId,
            removido: true,
            totalComentarios: await Comentario.count({
                where: { postagemId: comentario.postagemId, ativo: true }
            })
        });

        if (ehModeracao) {
            await AdminAuditService.log({
                adminId: solicitante.id,
                acao: "REMOVER_COMENTARIO",
                entidadeTipo: "comentario",
                entidadeId: comentario.id,
                descricao: "Comentário removido pela moderação.",
                metadata: {
                    before: { ativo: true },
                    after: { ativo: false },
                    autorId: comentario.usuarioId
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return { mensagem: "Comentário removido com sucesso." };
    }
}

export default new PostagemService();
