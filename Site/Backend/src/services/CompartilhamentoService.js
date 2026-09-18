import { Op } from "sequelize";

import sequelize from "../config/bancoDeDados.js";
import { Compartilhamento, Postagem, PostagemAnexo } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { garantirDono, garantirEmpresaAprovadaSeForEmpresa, ehAdministrador } from "../utils/autorizacao.js";
import { garantirAcessoAPostagem, assinarMidiaDasPostagens } from "./PostagemService.js";
import SeguidorService from "./SeguidorService.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";
import { incluirAutor } from "../utils/inclusoes.js";

/**
 * Compartilhamento de postagens do feed.
 */
class CompartilhamentoService {
    /**
     * `solicitante` é opcional só para chamadas internas que não precisam da checagem. Toda chamada
     * de fora deste arquivo deve passar o usuário autenticado; sem ele, daria para listar ou
     * compartilhar postagens de perfil privado sem seguir o autor.
     */
    async buscarPostagemAtiva(postagemId, solicitante) {
        const postagem = await Postagem.findByPk(postagemId);

        if (!postagem || !postagem.ativo) {
            throw ErroApi.naoEncontrado("Postagem não encontrada.");
        }

        if (solicitante !== undefined) {
            // Empresa pendente/reprovada/suspensa não lista nem cria
            // compartilhamento em nenhuma postagem: mesma autoridade de
            // `PostagemService.buscarAtiva`, sem duplicar a regra.
            await garantirEmpresaAprovadaSeForEmpresa(solicitante);
            await garantirAcessoAPostagem(postagem, solicitante);
        }

        return postagem;
    }

    async listarPorPostagem(postagemId, query, solicitante) {
        await this.buscarPostagemAtiva(postagemId, solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Compartilhamento.findAndCountAll({
            where: { postagemId },
            include: [incluirAutor()],
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta(
            "compartilhamentos",
            rows,
            count,
            pagina,
            limite
        );
    }

    /**
     * Compartilhamentos feitos por um usuário (`GET /compartilhamentos/usuario/:usuarioId`). As
     * postagens compartilhadas podem ser de qualquer autor: se o autor original for privado e o
     * solicitante não tiver acesso (dono, administrador ou seguidor aprovado), o item sai da lista,
     * para não vazar a postagem só porque alguém a compartilhou.
     *
     * O bloqueio segue a mesma autoridade central dos demais acessos sociais (`BloqueioService`):
     * vale tanto entre o solicitante e quem compartilhou quanto com o autor original.
     */
    async listarPorUsuario(usuarioId, query, solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        // Bloqueio entre o solicitante e o dono da aba tem prioridade sobre
        // qualquer outra regra de visibilidade, com o mesmo padrão/mensagem
        // genérica de `garantirVisibilidadePerfil`. Dono/admin sempre passam
        // (checagem interna do próprio `garantirNaoBloqueado`); no-op se
        // `solicitante` não vier (chamada interna sem usuário autenticado).
        await BloqueioService.garantirNaoBloqueado({ id: usuarioId }, solicitante);

        const wherePostagem = { ativo: true };

        if (solicitante && !ehAdministrador(solicitante)) {
            const [idsSeguidos, idsBloqueados] = await Promise.all([
                SeguidorService.idsSeguidos(solicitante.id),
                // Mesmo filtro usado por `PostagemService.listar`: exclui
                // também postagens cujo autor original (não só quem
                // compartilhou) tem bloqueio com o solicitante.
                BloqueioService.idsRelacionados(solicitante.id)
            ]);

            // `$postagem.usuario.perfil_publico$` (dois níveis de associação
            // a partir de Compartilhamento) gera SQL inválido no COUNT
            // automático do `findAndCountAll` (o JOIN de "usuario" não
            // existe ainda no ponto em que a condição é aplicada): um
            // `EXISTS` correlacionado evita depender desse caminho
            // multi-nível e funciona igual no SELECT e no COUNT.
            wherePostagem[Op.and] = [
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

        const { rows, count } = await Compartilhamento.findAndCountAll({
            where: { usuarioId },
            include: [
                {
                    model: Postagem,
                    as: "postagem",
                    where: wherePostagem,
                    required: true,
                    include: [
                        incluirAutor(),
                        { model: PostagemAnexo, as: "anexos" }
                    ]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["criadoEm", "DESC"]]
        });

        // O acesso já foi filtrado pelo `wherePostagem` acima (equivalente a
        // `garantirAcessoAPostagem`); só então as URLs dos anexos da postagem original são
        // resolvidas.
        const planas = rows.map((linha) => linha.toJSON());
        const postagensDasLinhas = planas.map((linha) => linha.postagem).filter(Boolean);

        await assinarMidiaDasPostagens(postagensDasLinhas);

        return montarResposta(
            "compartilhamentos",
            planas,
            count,
            pagina,
            limite
        );
    }

    async compartilhar(postagemId, comentario, solicitante) {
        const postagem = await this.buscarPostagemAtiva(postagemId, solicitante);

        const compartilhamento = await Compartilhamento.create({
            postagemId,
            usuarioId: solicitante.id,
            comentario: comentario ? String(comentario).trim() : null
        });

        if (String(postagem.usuarioId) !== String(solicitante.id)) {
            await NotificacaoService.criar({
                usuarioId: postagem.usuarioId,
                tipo: "feed",
                titulo: "Sua publicação foi compartilhada",
                descricao: `${solicitante.nome} compartilhou sua publicação.`,
                subtipo: "compartilhamento_postagem",
                entidadeTipo: "postagem",
                entidadeId: postagem.id,
                atorId: solicitante.id
            });
        }

        return Compartilhamento.findByPk(compartilhamento.id, {
            include: [incluirAutor()]
        });
    }

    async remover(id, solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const registro = await Compartilhamento.findByPk(id);

        if (!registro) {
            throw ErroApi.naoEncontrado("Compartilhamento não encontrado.");
        }

        garantirDono(solicitante, registro.usuarioId);

        await registro.destroy();

        return { mensagem: "Compartilhamento removido." };
    }
}

export default new CompartilhamentoService();
