import {
    FavoritoVaga,
    EmpresaSeguida,
    Vaga,
    Empresa,
    Candidato
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";

/**
 * Favoritar vagas e seguir empresas.
 * Ambas as ações pertencem ao candidato autenticado: o candidatoId
 * nunca vem do corpo da requisição (proteção contra IDOR).
 */
class InteracaoService {
    async candidatoDoUsuario(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            throw ErroApi.acessoNegado("Ação disponível apenas para candidatos.");
        }

        return candidato;
    }

    /* Favoritos de vaga */
    async alternarFavorito(vagaId, solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);

        const vaga = await Vaga.findByPk(vagaId);

        if (!vaga) {
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        const existente = await FavoritoVaga.findOne({
            where: { candidatoId: candidato.id, vagaId }
        });

        if (existente) {
            await existente.destroy();
            return { favoritado: false };
        }

        await FavoritoVaga.create({ candidatoId: candidato.id, vagaId });

        return { favoritado: true };
    }

    async listarFavoritos(solicitante, query) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await FavoritoVaga.findAndCountAll({
            where: { candidatoId: candidato.id },
            include: [
                {
                    model: Vaga,
                    as: "vaga",
                    include: [
                        {
                            model: Empresa,
                            as: "empresa",
                            attributes: ["id", "nomeFantasia", "razaoSocial", "logo"]
                        }
                    ]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("favoritos", rows, count, pagina, limite);
    }

    /* Empresas seguidas */
    // Seguir empresa fica só em `SeguidorService.alternarEmpresa` (rota
    // `POST /seguir/empresas/:id`), que aplica bloqueio e notificação; não crie outro caminho aqui.

    async listarSeguidas(solicitante, query) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await EmpresaSeguida.findAndCountAll({
            where: { candidatoId: candidato.id },
            include: [{ model: Empresa, as: "empresa" }],
            limit: limite,
            offset,
            distinct: true,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("empresas", rows, count, pagina, limite);
    }
}

export default new InteracaoService();
