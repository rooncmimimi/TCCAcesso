import CandidaturaService from "../services/CandidaturaService.js";
import CandidaturaAdaptacaoService from "../services/CandidaturaAdaptacaoService.js";
import CandidaturaRascunhoService from "../services/CandidaturaRascunhoService.js";

/**
 * Candidaturas. Candidatar-se, a prévia de privacidade, o rascunho e a lista da empresa ficam em
 * `/vagas/:vagaId/...`; as minhas, o detalhe, o status, o cancelamento e as adaptações
 * autorizadas, em `/candidaturas`.
 */
class CandidaturaController {
    async criar(req, res, next) {
        try {
            const candidatura = await CandidaturaService.criar(
                req.params.vagaId,
                req.body.mensagem,
                req.user,
                { compartilhar: req.body.compartilhar, aceita: req.body.aceita }
            );

            return res.status(201).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }

    async previa(req, res, next) {
        try {
            const previa = await CandidaturaAdaptacaoService.montarPrevia(
                req.params.vagaId,
                req.body.compartilhar ?? {},
                req.user
            );

            return res.status(200).json({ sucesso: true, previa });
        } catch (erro) {
            return next(erro);
        }
    }

    async obterRascunho(req, res, next) {
        try {
            const rascunho = await CandidaturaRascunhoService.obter(req.params.vagaId, req.user);

            return res.status(200).json({ sucesso: true, rascunho });
        } catch (erro) {
            return next(erro);
        }
    }

    async salvarRascunho(req, res, next) {
        try {
            const rascunho = await CandidaturaRascunhoService.salvar(req.params.vagaId, req.body, req.user);

            return res.status(200).json({ sucesso: true, rascunho });
        } catch (erro) {
            return next(erro);
        }
    }

    async descartarRascunho(req, res, next) {
        try {
            const resultado = await CandidaturaRascunhoService.descartar(req.params.vagaId, req.user);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async meusRascunhos(req, res, next) {
        try {
            const rascunhos = await CandidaturaRascunhoService.listar(req.user);

            return res.status(200).json({ sucesso: true, rascunhos });
        } catch (erro) {
            return next(erro);
        }
    }

    async editarAdaptacoes(req, res, next) {
        try {
            const adaptacoes = await CandidaturaAdaptacaoService.editar(
                req.params.id,
                { ...(req.body.compartilhar ?? {}), aceita: req.body.aceita },
                req.user
            );

            return res.status(200).json({ sucesso: true, adaptacoes });
        } catch (erro) {
            return next(erro);
        }
    }

    async retirarAdaptacoes(req, res, next) {
        try {
            const adaptacoes = await CandidaturaAdaptacaoService.retirar(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, adaptacoes });
        } catch (erro) {
            return next(erro);
        }
    }

    async responderAdaptacoes(req, res, next) {
        try {
            const adaptacoes = await CandidaturaAdaptacaoService.responder(req.params.id, req.body, req.user);

            return res.status(200).json({ sucesso: true, adaptacoes });
        } catch (erro) {
            return next(erro);
        }
    }

    async minhas(req, res, next) {
        try {
            const dados = await CandidaturaService.listarDoCandidato(
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async porVaga(req, res, next) {
        try {
            const dados = await CandidaturaService.listarDaVaga(
                req.params.vagaId,
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async obter(req, res, next) {
        try {
            const candidatura = await CandidaturaService.buscarPorId(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarStatus(req, res, next) {
        try {
            const candidatura = await CandidaturaService.atualizarStatus(
                req.params.id,
                req.body.status,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }

    async cancelar(req, res, next) {
        try {
            const candidatura = await CandidaturaService.cancelar(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, candidatura });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new CandidaturaController();
