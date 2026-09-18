import EmpresaService from "../services/EmpresaService.js";
import { urlPublica } from "../middlewares/uploadMiddleware.js";
import { Empresa } from "../models/index.js";
import ArmazenamentoService from "../services/ArmazenamentoService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Perfil de empresa (`/empresas`): consulta, empresas parceiras, edição, logo e capa e exclusão
 * pelo administrador.
 */
class EmpresaController {
    async listar(req, res, next) {
        try {
            const dados = await EmpresaService.listar(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async parceiras(req, res, next) {
        try {
            const empresas = await EmpresaService.listarParceiras();

            return res.status(200).json({ sucesso: true, empresas });
        } catch (erro) {
            return next(erro);
        }
    }

    async perfilAtual(req, res, next) {
        try {
            const empresa = await EmpresaService.buscarPorUsuario(req.user.id);

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async porUsuario(req, res, next) {
        try {
            const empresa = await EmpresaService.buscarPorUsuarioPublico(
                req.params.usuarioId,
                req.user
            );

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async obter(req, res, next) {
        try {
            const empresa = await EmpresaService.buscarPorId(req.params.id, req.user);

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const empresa = await EmpresaService.atualizar(
                req.params.id,
                req.body,
                req.user
            );

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async enviarLogo(req, res, next) {
        try {
            const logo = urlPublica(req.file);

            const anterior = await Empresa.findByPk(req.params.id, {
                attributes: ["logo"],
                raw: true
            });

            const empresa = await EmpresaService.atualizar(
                req.params.id,
                { logo },
                req.user
            );

            if (anterior?.logo && anterior.logo !== logo) {
                await ArmazenamentoService.removerArquivoFisico(anterior.logo, {
                    privado: false
                });
            }

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async enviarCapa(req, res, next) {
        try {
            const capa = urlPublica(req.file);

            const anterior = await Empresa.findByPk(req.params.id, {
                attributes: ["capa"],
                raw: true
            });

            const empresa = await EmpresaService.atualizar(
                req.params.id,
                { capa },
                req.user
            );

            if (anterior?.capa && anterior.capa !== capa) {
                await ArmazenamentoService.removerArquivoFisico(anterior.capa, {
                    privado: false
                });
            }

            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await EmpresaService.excluir(
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

export default new EmpresaController();
