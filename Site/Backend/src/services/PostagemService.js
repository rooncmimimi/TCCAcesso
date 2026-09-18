import { Op } from "sequelize";

import sequelize from "../config/bancoDeDados.js";
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
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { garantirDono, garantirEmpresaAprovadaSeForEmpresa, ehAdministrador } from "../utils/autorizacao.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import SeguidorService from "./SeguidorService.js";
import BloqueioService from "./BloqueioService.js";
import ArmazenamentoService from "./ArmazenamentoService.js";
import { emitirFeed } from "../realtime/socket.js";
import { urlPublica, tipoDoArquivo } from "../middlewares/uploadMiddleware.js";
import { gerarUrlAssinada, gerarUrlsAssinadas } from "../utils/supabaseStorage.js";
import { incluirAutor } from "../utils/inclusoes.js";

/**
 * Compensação explícita: o Supabase Storage e o PostgreSQL não compartilham transação, então, se
 * `Postagem.create` ou `PostagemAnexo.bulkCreate` falharem depois que `processarAnexosPostagem`
 * (`uploadMiddleware.js`) enviou os anexos, esses arquivos ficariam órfãos, sem linha no banco.
 *
 * Só roda quando há `arquivos` e percorre exatamente os desta requisição. Usa
 * `ArmazenamentoService.removerArquivoFisico`, o mesmo mecanismo da troca de foto, capa, logo e currículo.
 * Uma falha na limpeza nunca substitui o erro original.
 */
async function limparAnexosDaOperacao(arquivos) {
    if (!arquivos || arquivos.length === 0) return;

    const resultados = await Promise.allSettled(
        arquivos.map((arquivo) =>
            ArmazenamentoService.removerArquivoFisico(urlPublica(arquivo), { privado: true })
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
 * O autor inclui `perfilPublico` e `tipoUsuario` só para a checagem de acesso a conteúdo privado;
 * esses campos não saem na resposta (o `attributes` de `incluirAutor()` limita o que sai). Vale só
 * para usuário e candidato: postagens de empresa ficam sempre visíveis, porque seguir empresa é
 * outra tabela (`EmpresaSeguida`), sem solicitação nem aprovação.
 */
export async function garantirAcessoAPostagem(postagem, solicitante) {
    const usuarioId = postagem.usuarioId;

    // Bloqueio tem prioridade sobre qualquer outra regra de visibilidade: mesmo autor público ou
    // empresa, que abaixo passam sem outra checagem, fica indisponível para quem tem bloqueio com
    // ele, em qualquer sentido. Administrador não é afetado por bloqueio, como em
    // `BloqueioService.garantirNaoBloqueado`. A mensagem é genérica e não revela que o motivo é
    // bloqueio.
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
            throw ErroApi.acessoNegado("Esta publicação não está disponível.");
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
        throw ErroApi.acessoNegado(
            "Este perfil é privado. Siga para ver as publicações."
        );
    }
}

/**
 * Troca os caminhos crus de `anexos[].url` por URLs assinadas, sempre depois de
 * `garantirAcessoAPostagem` (ou do filtro SQL equivalente do `findAll`) aprovar cada postagem;
 * nunca chame antes da autorização. É usada por todo lugar que serializa postagens
 * (`PostagemService.decorar`, `CompartilhamentoService`, `BuscaService`,
 * `PublicoService.paginaInicial`).
 *
 * Todo anexo fica no bucket privado, então a URL é sempre assinada. As assinaturas saem em lote,
 * agrupadas por validade: no máximo 2 chamadas ao Supabase por página (autores públicos e empresas
 * com validade longa, autores privados com validade curta), nunca uma por imagem.
 *
 * Altera e devolve a mesma lista recebida (objetos já planos, depois de `.toJSON()`, nunca
 * instâncias do Sequelize).
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

    // Agrupa por TTL (não por postagem/anexo): uma chamada em lote por
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

        for (const anexo of anexos) {
            if (!anexo.url) continue;

            registrarParaAssinar(anexo.url, ttl, (url) => {
                anexo.url = url;
            });
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

const incluirAnexos = () => ({
    model: PostagemAnexo,
    as: "anexos",
    separate: true,
    order: [["ordem", "ASC"]]
});

/**
 * Postagens do feed: listagem com as regras de visibilidade (perfil privado, bloqueio, empresa não
 * aprovada), linha do tempo, criação com anexos, edição, exclusão, curtidas e comentários.
 */
class PostagemService {
    async buscarAtiva(id, transaction, solicitante) {
        const postagem = await Postagem.findByPk(id, { transaction });

        if (!postagem || !postagem.ativo) {
            throw ErroApi.naoEncontrado("Postagem não encontrada.");
        }

        if (solicitante !== undefined) {
            // Ponto único usado por editar, remover, curtir, comentar e
            // gerar URL de anexo: empresa pendente/reprovada/suspensa não
            // interage com nenhuma postagem por nenhuma dessas vias, sem
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

        // Chamada por último, depois que toda postagem passou pela autorização
        // (`garantirAcessoAPostagem` ou o filtro SQL do `findAll`).
        return assinarMidiaDasPostagens(decoradas);
    }

    /* Feed (autenticado): prioriza quem o usuário segue */
    async listar(query, solicitante) {
        // Empresa pendente/reprovada/suspensa não acessa o feed (nem o
        // geral, nem a aba "Publicações" de outro perfil), pela mesma
        // autoridade central de `garantirEmpresaAprovada`, nunca uma
        // segunda regra. Nunca afeta candidato/administrador.
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };

        if (query.usuarioId) {
            // Publicações de um perfil específico: se o autor for privado e o solicitante não tiver
            // acesso (dono, administrador ou seguidor aprovado), a lista inteira é negada, e não
            // filtrada em silêncio, para a mensagem "este perfil é privado" aparecer.
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

        // Feed geral (sem filtro por autor nem por "seguindo"): postagem de autor com perfil
        // privado só entra se o solicitante for o autor ou seguidor aprovado, com o filtro no SQL,
        // sem confiar no cliente para esconder. Postagens de empresa não são filtradas aqui, porque
        // seguir empresa não tem aprovação; administrador sempre vê tudo.
        if (
            !query.usuarioId &&
            query.escopo !== "seguindo" &&
            solicitante &&
            !ehAdministrador(solicitante)
        ) {
            const [idsSeguidos, idsBloqueados] = await Promise.all([
                SeguidorService.idsSeguidos(solicitante.id),
                // O feed geral nunca lista postagem de quem tem bloqueio com o solicitante, em
                // qualquer sentido, inclusive de autor público, que abaixo passa sem outra
                // checagem. É o mesmo helper usado para excluir pessoas bloqueadas das listas
                // sociais.
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
            order: [["criadoEm", "DESC"]]
        });

        const postagens = await this.decorar(rows, solicitante);

        return montarResposta("postagens", postagens, count, pagina, limite);
    }

    /* Linha do tempo de um perfil */
    /**
     * Publicações próprias e compartilhamentos de um usuário, intercalados por data (mais recente
     * primeiro), numa única lista. Cada item traz `tipo: "postagem" | "compartilhamento"`; um
     * compartilhamento traz a postagem original (de qualquer autor) em `item.postagem`, decorada
     * pelo mesmo `decorar` de uma postagem própria, para mostrar curtidas, comentários e
     * `curtidoPorMim` corretos.
     *
     * Autorização: `garantirAcessoAPostagem({ usuarioId }, solicitante)` decide uma vez o acesso ao
     * perfil (dono, administrador, seguidor aprovado ou perfil público) para a lista inteira, a
     * mesma regra das publicações do perfil. Assim, os compartilhamentos de um perfil privado ficam
     * protegidos como as publicações próprias.
     *
     * Paginação: para intercalar por data sem UNION em SQL bruto (dois models com includes
     * diferentes), busca até `offset + limite` linhas de cada fonte (no pior caso a página inteira
     * vem de uma só), junta em memória, ordena e recorta a página. Para os tamanhos de página de um
     * perfil o custo é pequeno, e a tabela nunca é lida inteira.
     */
    async linhaDoTempoDoUsuario(usuarioId, query, solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);
        await garantirAcessoAPostagem({ usuarioId }, solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);
        const buscaAte = offset + limite;

        const wherePostagensProprias = { ativo: true, usuarioId };

        // Visibilidade do autor original de uma postagem compartilhada:
        // pode ser qualquer pessoa, não só o dono desta linha do tempo.
        // Mesma regra de `CompartilhamentoService.listarPorUsuario`.
        const wherePostagemOriginal = { ativo: true };

        if (solicitante && !ehAdministrador(solicitante)) {
            const [idsSeguidos, idsBloqueados] = await Promise.all([
                SeguidorService.idsSeguidos(solicitante.id),
                BloqueioService.idsRelacionados(solicitante.id)
            ]);

            wherePostagemOriginal[Op.and] = [
                {
                    [Op.or]: [
                        sequelize.literal(
                            `EXISTS (SELECT 1 FROM usuarios u WHERE u.id = "postagem"."usuario_id" AND (u.perfil_publico = true OR u.tipo_usuario = 'empresa'))`
                        ),
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

        const [totalPostagens, totalCompartilhamentos, postagensRows, compartilhamentosRows] =
            await Promise.all([
                Postagem.count({ where: wherePostagensProprias }),
                Compartilhamento.count({
                    where: { usuarioId },
                    include: [
                        {
                            model: Postagem,
                            as: "postagem",
                            where: wherePostagemOriginal,
                            required: true
                        }
                    ],
                    distinct: true
                }),
                Postagem.findAll({
                    where: wherePostagensProprias,
                    include: [incluirAutor(), incluirAnexos()],
                    order: [["criadoEm", "DESC"]],
                    limit: buscaAte
                }),
                Compartilhamento.findAll({
                    where: { usuarioId },
                    include: [
                        {
                            model: Postagem,
                            as: "postagem",
                            where: wherePostagemOriginal,
                            required: true,
                            include: [incluirAutor(), incluirAnexos()]
                        }
                    ],
                    order: [["criadoEm", "DESC"]],
                    limit: buscaAte
                })
            ]);

        const [postagensDecoradas, postagensCompartilhadasDecoradas] = await Promise.all([
            this.decorar(postagensRows, solicitante),
            this.decorar(
                compartilhamentosRows.map((linha) => linha.postagem),
                solicitante
            )
        ]);

        const itensPostagem = postagensDecoradas.map((postagem) => ({
            tipo: "postagem",
            id: postagem.id,
            criadoEm: postagem.criadoEm,
            postagem
        }));

        const itensCompartilhamento = compartilhamentosRows.map((linha, indice) => ({
            tipo: "compartilhamento",
            id: linha.id,
            criadoEm: linha.criadoEm,
            comentario: linha.comentario,
            postagem: postagensCompartilhadasDecoradas[indice]
        }));

        const unificada = [...itensPostagem, ...itensCompartilhamento]
            .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
            .slice(offset, offset + limite);

        return montarResposta(
            "itens",
            unificada,
            totalPostagens + totalCompartilhamentos,
            pagina,
            limite
        );
    }

    /* Detalhe com comentários em árvore */
    async buscarPorId(id, solicitante = null) {
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
            order: [[{ model: Comentario, as: "comentarios" }, "criadoEm", "ASC"]]
        });

        if (!postagem) {
            throw ErroApi.naoEncontrado("Postagem não encontrada.");
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
     * malformada; o pior caso é o anexo nascer sem descrição).
     */
    interpretarDescricoesAnexos(bruto) {
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

    /* Criar (texto e até 4 anexos) */
    async criar(data, solicitante, arquivos = []) {
        const conteudo = String(data.conteudo || "").trim();

        if (!conteudo && arquivos.length === 0) {
            throw ErroApi.requisicaoInvalida(
                "Escreva algo ou anexe um arquivo para publicar."
            );
        }

        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const transaction = await sequelize.transaction();

        let postagem;

        try {
            postagem = await Postagem.create(
                {
                    usuarioId: solicitante.id,
                    conteudo,
                    publica: data.publica === undefined ? true : Boolean(data.publica)
                },
                { transaction }
            );

            if (arquivos.length > 0) {
                const descricoes = this.interpretarDescricoesAnexos(data.descricoesAnexos);

                await PostagemAnexo.bulkCreate(
                    arquivos.map((arquivo, indice) => ({
                        postagemId: postagem.id,
                        tipo: tipoDoArquivo(arquivo),
                        url: urlPublica(arquivo),
                        nomeOriginal: arquivo.originalname?.slice(0, 255),
                        tipoMime: arquivo.mimetype,
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
        const criada = await this.buscarPorId(postagem.id, solicitante);

        // Nunca inclua o objeto de domínio completo aqui (ver o comentário
        // de segurança em `realtime/socket.js` sobre `emitirFeed`). O cliente
        // revalida via REST, que já aplica `garantirAcessoAPostagem`.
        emitirFeed("feed:postagem", { id: criada.id, criada: true });

        return criada;
    }



    /* Atualizar (autor ou administrador) */
    async atualizar(id, data, solicitante) {
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

        const atualizada = await this.buscarPorId(id, solicitante);

        // Nunca inclua o objeto de domínio completo aqui, pela mesma regra de `criar()` acima.
        emitirFeed("feed:postagem", { id: atualizada.id, atualizada: true });

        return atualizada;
    }

    /**
     * Edita só a descrição acessível de um anexo já publicado, nunca o arquivo (trocar a mídia
     * exigiria novo upload). Mesma autorização de dono de `atualizar`.
     */
    async atualizarDescricaoAnexo(postagemId, anexoId, descricao, solicitante) {
        const postagem = await this.buscarAtiva(postagemId, undefined, solicitante);

        garantirDono(solicitante, postagem.usuarioId);

        const anexo = await PostagemAnexo.findOne({
            where: { id: anexoId, postagemId }
        });

        if (!anexo) {
            throw ErroApi.naoEncontrado("Anexo não encontrado nesta publicação.");
        }

        const descricaoLimpa = descricao == null ? null : String(descricao).trim().slice(0, 500) || null;

        await anexo.update({ descricao: descricaoLimpa });

        const atualizada = await this.buscarPorId(postagemId, solicitante);

        // Nunca inclua o objeto de domínio completo aqui, pela mesma regra de `criar()` acima.
        emitirFeed("feed:postagem", { id: atualizada.id, atualizada: true });

        return atualizada;
    }

    /**
     * Única forma de obter uma URL utilizável de um anexo específico (exibição inline ou download).
     * Reautoriza do zero com `garantirAcessoAPostagem` a cada chamada, sem reaproveitar URL ou
     * aprovação anterior. O `anexoId` é sempre buscado junto do `postagemId` (nunca
     * `findByPk(anexoId)` sozinho), o que fecha o IDOR de trocar o `anexoId` pelo de outra
     * publicação mantendo um `postagemId` autorizado.
     */
    async gerarUrlAnexo(postagemId, anexoId, solicitante, { baixar = false } = {}) {
        const postagem = await this.buscarAtiva(postagemId, undefined, solicitante);

        const anexo = await PostagemAnexo.findOne({
            where: { id: anexoId, postagemId }
        });

        if (!anexo) {
            throw ErroApi.naoEncontrado("Anexo não encontrado nesta publicação.");
        }

        const autor = await Usuario.findByPk(postagem.usuarioId, {
            attributes: ["perfilPublico", "tipoUsuario"]
        });
        const publico = !autor || autor.tipoUsuario === "empresa" || autor.perfilPublico;

        // Download é sempre de curta duração, mesmo pra autor
        // público/empresa: é uma ação pontual, não uma URL embutida
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
            throw ErroApi.naoEncontrado("Não foi possível gerar acesso a este arquivo.");
        }

        return { url: resultado.url, expiraEm: resultado.expiraEm };
    }

    /* Remover (exclusão lógica pela coluna "ativo") */
    async excluir(id, solicitante, contexto = {}) {
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
                tipo: "feed",
                titulo: "Publicação removida",
                descricao: "Sua publicação foi removida pela moderação por violar as diretrizes da comunidade.",
                subtipo: "postagem_removida_moderacao"
            });

            await AdminAuditoriaService.registrar({
                administradorId: solicitante.id,
                acao: "remover_postagem",
                entidadeTipo: "postagem",
                entidadeId: postagem.id,
                descricao: "Postagem removida pela moderação.",
                metadados: {
                    antes: { ativo: true },
                    depois: { ativo: false },
                    autorId: postagem.usuarioId
                },
                ip: contexto.ip,
                userAgent: contexto.userAgent
            });
        }

        return { mensagem: "Postagem removida com sucesso." };
    }

    /* Curtir e descurtir (alternância idempotente) */
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
                    tipo: "feed",
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

    /* Comentários */
    async comentar(id, comentario, solicitante, comentarioPaiId = null) {
        const postagem = await this.buscarAtiva(id, undefined, solicitante);
        let pai = null;

        if (comentarioPaiId) {
            pai = await Comentario.findByPk(comentarioPaiId);

            if (!pai || !pai.ativo || String(pai.postagemId) !== String(id)) {
                throw ErroApi.naoEncontrado("Comentário respondido não encontrado.");
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
                tipo: "feed",
                titulo: "Novo comentário na sua publicação",
                descricao: `${solicitante.nome} comentou: ${previa}`,
                subtipo: "comentario_postagem",
                entidadeTipo: "postagem",
                entidadeId: postagem.id,
                atorId: solicitante.id
            });
        }

        // Resposta a um comentário: avisa o autor do comentário-pai
        // também, à parte do dono da postagem, exceto se for a mesma
        // pessoa (já notificada acima) ou a própria pessoa respondendo
        // ao próprio comentário (não faz sentido se auto-notificar).
        if (
            pai &&
            String(pai.usuarioId) !== String(solicitante.id) &&
            String(pai.usuarioId) !== String(postagem.usuarioId)
        ) {
            await NotificacaoService.criar({
                usuarioId: pai.usuarioId,
                tipo: "feed",
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

        // Nunca inclua o comentário completo aqui (autor e texto), pela mesma regra de `criar()` e
        // `atualizar()`; o cliente revalida `["comentarios", postagemId]` pela API.
        emitirFeed("feed:comentario", {
            postagemId: id,
            totalComentarios: total
        });

        return completo;
    }

    async removerComentario(comentarioId, solicitante, contexto = {}) {
        const comentario = await Comentario.findByPk(comentarioId);

        if (!comentario || !comentario.ativo) {
            throw ErroApi.naoEncontrado("Comentário não encontrado.");
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
            await AdminAuditoriaService.registrar({
                administradorId: solicitante.id,
                acao: "remover_comentario",
                entidadeTipo: "comentario",
                entidadeId: comentario.id,
                descricao: "Comentário removido pela moderação.",
                metadados: {
                    antes: { ativo: true },
                    depois: { ativo: false },
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
