import { Op } from "sequelize";

import sequelize from "../config/database.js";
import {
    Compartilhamento,
    Postagem,
    PostagemAnexo,
    Usuario
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, garantirEmpresaAprovadaSeForEmpresa, ehAdministrador } from "../utils/authorization.js";
import { garantirAcessoAPostagem, assinarMidiaDasPostagens } from "./PostagemService.js";
import SeguidorService from "./SeguidorService.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";

// Fábrica: o Sequelize muta objetos de include, então cada uso precisa de um novo objeto.
const incluirAutor = () => ({
    model: Usuario,
    as: "usuario",
    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
});

/**
 * Compartilhamento de postagens do feed.
 */
class CompartilhamentoService {
    /**
     * `solicitante` é opcional só por compatibilidade com chamadas internas
     * que não precisam da checagem (nenhuma hoje) — todo caller de fora
     * deste arquivo deve sempre passar o usuário autenticado (Fase 3): sem
     * isso, dava pra compartilhar/listar compartilhamentos de uma postagem
     * de perfil privado sem nunca ter seguido o autor.
     */
    async buscarPostagemAtiva(postagemId, solicitante) {
        const postagem = await Postagem.findByPk(postagemId);

        if (!postagem || !postagem.ativo) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        if (solicitante !== undefined) {
            // Empresa pendente/reprovada/suspensa não lista nem cria
            // compartilhamento em nenhuma postagem — mesma autoridade de
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
            order: [["created_at", "DESC"]]
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
     * Compartilhamentos feitos por um usuário — usado na aba
     * "Compartilhamentos" do perfil. As postagens compartilhadas podem ser
     * de QUALQUER autor; se o autor original for privado e o solicitante
     * não tiver acesso (dono/admin/seguidor aprovado), o compartilhamento é
     * excluído da lista — nunca vaza o conteúdo da postagem original só
     * porque alguém a compartilhou (Fase 3).
     *
     * Correção (auditoria de segurança, achado A1): faltava aqui a mesma
     * checagem de bloqueio que TODO outro acesso a conteúdo/perfil social já
     * aplica (`garantirAcessoAPostagem`, `PostagemService.findAll`,
     * `BloqueioService.garantirVisibilidadePerfil`) — um bloqueio entre o
     * solicitante e o DONO da aba (quem compartilhou) não impedia ver esta
     * lista, e o autor ORIGINAL de uma postagem compartilhada também não
     * era excluído por bloqueio. Reaproveita a mesma autoridade central
     * (`BloqueioService`) em vez de uma segunda implementação da regra.
     */
    async listarPorUsuario(usuarioId, query, solicitante) {
        await garantirEmpresaAprovadaSeForEmpresa(solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        // Bloqueio entre o solicitante e o dono da aba tem prioridade sobre
        // qualquer outra regra de visibilidade — mesmo padrão/mensagem
        // genérica de `garantirVisibilidadePerfil`. Dono/admin sempre passam
        // (checagem interna do próprio `garantirNaoBloqueado`); no-op se
        // `solicitante` não vier (chamada interna sem usuário autenticado).
        await BloqueioService.garantirNaoBloqueado({ id: usuarioId }, solicitante);

        const wherePostagem = { ativo: true };

        if (solicitante && !ehAdministrador(solicitante)) {
            const [idsSeguidos, idsBloqueados] = await Promise.all([
                SeguidorService.idsSeguidos(solicitante.id),
                // Mesmo filtro usado por `PostagemService.findAll`: exclui
                // também postagens cujo autor ORIGINAL (não só quem
                // compartilhou) tem bloqueio com o solicitante.
                BloqueioService.idsRelacionados(solicitante.id)
            ]);

            // `$postagem.usuario.perfil_publico$` (dois níveis de associação
            // a partir de Compartilhamento) gera SQL inválido no COUNT
            // automático do `findAndCountAll` (o JOIN de "usuario" não
            // existe ainda no ponto em que a condição é aplicada) — um
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
            order: [["created_at", "DESC"]]
        });

        // Fase 7: já filtrado pelo `wherePostagem` acima (equivalente ao
        // `garantirAcessoAPostagem`) — só agora, com o acesso já decidido,
        // resolve URL de exibição dos anexos da postagem original.
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
                tipo: "Feed",
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
            throw ApiError.notFound("Compartilhamento não encontrado.");
        }

        garantirDono(solicitante, registro.usuarioId);

        await registro.destroy();

        return { mensagem: "Compartilhamento removido." };
    }
}

export default new CompartilhamentoService();
