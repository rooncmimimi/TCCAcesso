import VagaService from "../services/VagaService.js";
import VagaMidiaService from "../services/VagaMidiaService.js";
import { catalogoDoAmbiente } from "../utils/ambienteDeTrabalho.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Vagas (`/vagas`): listagem pública, vagas da empresa, criação, edição, status, estatísticas e
 * exclusão.
 */
class VagaController {
    async listar(req, res, next) {
        try {
            const dados = await VagaService.listar(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    /** As listas fechadas do ambiente de trabalho e da entrevista (uma fonte só para formulário e telas). */
    catalogoDeAcessibilidade(req, res) {
        return res.status(200).json({ sucesso: true, catalogo: catalogoDoAmbiente() });
    }

    async obterMidia(req, res, next) {
        try {
            const midia = await VagaMidiaService.obter(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, midia });
        } catch (erro) {
            return next(erro);
        }
    }

    async enviarVideo(req, res, next) {
        try {
            const midia = await VagaMidiaService.salvarVideo(req.params.id, req.file, req.body, req.user);

            return res.status(200).json({ sucesso: true, midia });
        } catch (erro) {
            return next(erro);
        }
    }

    async enviarLegenda(req, res, next) {
        try {
            const midia = await VagaMidiaService.salvarLegenda(req.params.id, req.file, req.user);

            return res.status(200).json({ sucesso: true, midia });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerLegenda(req, res, next) {
        try {
            const midia = await VagaMidiaService.removerLegenda(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, midia });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarMidia(req, res, next) {
        try {
            const midia = await VagaMidiaService.atualizarTextos(req.params.id, req.body, req.user);

            return res.status(200).json({ sucesso: true, midia });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerMidia(req, res, next) {
        try {
            const resultado = await VagaMidiaService.remover(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async minhas(req, res, next) {
        try {
            const dados = await VagaService.buscarPorEmpresaAutenticada(
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
            const vaga = await VagaService.buscarPorId(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async criar(req, res, next) {
        try {
            const vaga = await VagaService.criar(req.body, req.user);

            return res.status(201).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const vaga = await VagaService.atualizar(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async alterarStatus(req, res, next) {
        try {
            const vaga = await VagaService.alterarStatus(
                req.params.id,
                req.body.status,
                req.user,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, vaga });
        } catch (erro) {
            return next(erro);
        }
    }

    async estatisticas(req, res, next) {
        try {
            const dados = await VagaService.estatisticas(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await VagaService.excluir(
                req.params.id,
                req.user,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new VagaController();
