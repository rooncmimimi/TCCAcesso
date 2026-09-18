import PerfilCandidatoService from "../services/PerfilCandidatoService.js";

/**
 * Perfil profissional em `/perfil`: o perfil consolidado de um candidato (por candidato ou por
 * usuário) e as experiências, formações, certificados e habilidades (`/perfil/:recurso`).
 */
class PerfilCandidatoController {
    async perfilCompleto(req, res, next) {
        try {
            const candidato = await PerfilCandidatoService.perfilCompleto(
                req.params.candidatoId,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    async perfilCompletoPorUsuario(req, res, next) {
        try {
            const candidato = await PerfilCandidatoService.perfilCompletoPorUsuario(
                req.params.usuarioId,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidato });
        } catch (erro) {
            return next(erro);
        }
    }

    async listar(req, res, next) {
        try {
            const registros = await PerfilCandidatoService.listarDoUsuario(
                req.params.recurso,
                req.user
            );

            return res.status(200).json({ sucesso: true, registros });
        } catch (erro) {
            return next(erro);
        }
    }

    async criar(req, res, next) {
        try {
            const registro = await PerfilCandidatoService.criar(
                req.params.recurso,
                req.body,
                req.user
            );

            return res.status(201).json({ sucesso: true, registro });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const registro = await PerfilCandidatoService.atualizar(
                req.params.recurso,
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, registro });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await PerfilCandidatoService.remover(
                req.params.recurso,
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new PerfilCandidatoController();
