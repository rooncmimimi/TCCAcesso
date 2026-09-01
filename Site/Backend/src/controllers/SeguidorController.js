import SeguidorService from "../services/SeguidorService.js";

class SeguidorController {
    async seguirUsuario(req, res, next) {
        try {
            const dados = await SeguidorService.alternarUsuario(
                req.params.usuarioId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async seguirEmpresa(req, res, next) {
        try {
            const dados = await SeguidorService.alternarEmpresa(
                req.params.empresaId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async seguidores(req, res, next) {
        try {
            const dados = await SeguidorService.listarSeguidores(
                req.params.usuarioId,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async seguindo(req, res, next) {
        try {
            const dados = await SeguidorService.listarSeguindo(
                req.params.usuarioId,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async resumo(req, res, next) {
        try {
            const dados = await SeguidorService.resumo(
                req.params.usuarioId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async resumoEmpresa(req, res, next) {
        try {
            const dados = await SeguidorService.resumoEmpresa(
                req.params.empresaId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async sugestoes(req, res, next) {
        try {
            const dados = await SeguidorService.sugestoesPessoas(
                req.user,
                req.query.limit
            );

            return res.status(200).json({ sucesso: true, sugestoes: dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async sugestoesEmpresas(req, res, next) {
        try {
            const dados = await SeguidorService.sugestoesEmpresas(
                req.user,
                req.query.limit
            );

            return res.status(200).json({ sucesso: true, sugestoes: dados });
        } catch (erro) {
            return next(erro);
        }
    }

    /* ---------- Solicitações de seguimento (perfil privado) — Fase 3 ---------- */

    async solicitarSeguir(req, res, next) {
        try {
            const dados = await SeguidorService.solicitar(
                req.params.destinatarioId,
                req.user
            );

            return res.status(201).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async cancelarSolicitacao(req, res, next) {
        try {
            const dados = await SeguidorService.cancelarSolicitacao(
                req.params.destinatarioId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async aceitarSolicitacao(req, res, next) {
        try {
            const dados = await SeguidorService.aceitarSolicitacao(
                req.params.solicitacaoId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async recusarSolicitacao(req, res, next) {
        try {
            const dados = await SeguidorService.recusarSolicitacao(
                req.params.solicitacaoId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new SeguidorController();
