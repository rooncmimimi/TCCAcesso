import {
    FavoritoVaga,
    EmpresaSeguida,
    Vaga,
    Empresa,
    Candidato
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";

/**
 * Favoritar vagas e seguir empresas.
 * Ambas as ações pertencem ao candidato autenticado — o candidatoId
 * nunca vem do corpo da requisição (proteção contra IDOR).
 */
class InteracaoService {
    async candidatoDoUsuario(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            throw ApiError.forbidden("Ação disponível apenas para candidatos.");
        }

        return candidato;
    }

    /* ==========================================================
       FAVORITOS DE VAGA
    ========================================================== */
    async alternarFavorito(vagaId, solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);

        const vaga = await Vaga.findByPk(vagaId);

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
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
            order: [["created_at", "DESC"]]
        });

        return montarResposta("favoritos", rows, count, pagina, limite);
    }

    /* ==========================================================
       EMPRESAS SEGUIDAS
    ========================================================== */
    async alternarSeguir(empresaId, solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);

        const empresa = await Empresa.findByPk(empresaId);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        const existente = await EmpresaSeguida.findOne({
            where: { candidatoId: candidato.id, empresaId }
        });

        if (existente) {
            await existente.destroy();
            return { seguindo: false };
        }

        await EmpresaSeguida.create({ candidatoId: candidato.id, empresaId });

        return { seguindo: true };
    }

    async listarSeguidas(solicitante, query) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await EmpresaSeguida.findAndCountAll({
            where: { candidatoId: candidato.id },
            include: [{ model: Empresa, as: "empresa" }],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("empresas", rows, count, pagina, limite);
    }
}

export default new InteracaoService();
