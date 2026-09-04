import AdminEmpresaService from "../services/AdminEmpresaService.js";
import AdminUsuarioService from "../services/AdminUsuarioService.js";
import AdminConteudoService from "../services/AdminConteudoService.js";
import AdminRelatorioService from "../services/AdminRelatorioService.js";
import UsuarioService from "../services/UsuarioService.js";
import AdminAuditService from "../services/AdminAuditService.js";

const contextoDa = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

class AdminController {
    async empresas(req, res, next) {
        try {
            const dados = await AdminEmpresaService.listarEmpresas(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async aprovarEmpresa(req, res, next) {
        try {
            const empresa = await AdminEmpresaService.avaliarEmpresa(
                req.params.id,
                { aprovada: true },
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async reprovarEmpresa(req, res, next) {
        try {
            const empresa = await AdminEmpresaService.avaliarEmpresa(
                req.params.id,
                { aprovada: false, motivo: req.body.motivo },
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async suspenderEmpresa(req, res, next) {
        try {
            const empresa = await AdminEmpresaService.suspenderEmpresa(
                req.params.id,
                { motivo: req.body.motivo },
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async reativarEmpresa(req, res, next) {
        try {
            const empresa = await AdminEmpresaService.reativarEmpresa(
                req.params.id,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async verificarEmpresa(req, res, next) {
        try {
            const empresa = await AdminEmpresaService.verificarEmpresa(
                req.params.id,
                { verificada: req.body.verificada },
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, empresa });
        } catch (erro) {
            return next(erro);
        }
    }

    async usuarios(req, res, next) {
        try {
            const dados = await AdminUsuarioService.listarUsuarios(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async usuario(req, res, next) {
        try {
            const usuario = await UsuarioService.buscarPorId(req.params.id);
            return res.status(200).json({ sucesso: true, usuario });
        } catch (erro) {
            return next(erro);
        }
    }

    async bloquearUsuario(req, res, next) {
        try {
            const dados = await AdminUsuarioService.alternarBloqueio(
                req.params.id,
                req.body,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerUsuario(req, res, next) {
        try {
            const dados = await AdminUsuarioService.removerUsuario(
                req.params.id,
                { motivo: req.body?.motivo },
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async postagens(req, res, next) {
        try {
            const dados = await AdminConteudoService.listarPostagens(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerPostagem(req, res, next) {
        try {
            const dados = await AdminConteudoService.removerPostagem(
                req.params.id,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerComentario(req, res, next) {
        try {
            const dados = await AdminConteudoService.removerComentario(
                req.params.id,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async comentarios(req, res, next) {
        try {
            const dados = await AdminConteudoService.listarComentarios(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async vagas(req, res, next) {
        try {
            const dados = await AdminConteudoService.listarVagas(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async ocultarVaga(req, res, next) {
        try {
            const dados = await AdminConteudoService.alternarVisibilidadeVaga(
                req.params.id,
                req.body.oculta,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async relatorios(req, res, next) {
        try {
            const dados = await AdminRelatorioService.relatorios();
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async logs(req, res, next) {
        try {
            const dados = await AdminAuditService.listar(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AdminController();
