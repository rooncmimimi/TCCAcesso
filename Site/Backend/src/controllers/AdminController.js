import AdminService from "../services/AdminService.js";
import UsuarioService from "../services/UsuarioService.js";
import AdminAuditService from "../services/AdminAuditService.js";

const contextoDa = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

class AdminController {
    async empresas(req, res, next) {
        try {
            const dados = await AdminService.listarEmpresas(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async aprovarEmpresa(req, res, next) {
        try {
            const empresa = await AdminService.avaliarEmpresa(
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
            const empresa = await AdminService.avaliarEmpresa(
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
            const empresa = await AdminService.suspenderEmpresa(
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
            const empresa = await AdminService.reativarEmpresa(
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
            const empresa = await AdminService.verificarEmpresa(
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
            const dados = await AdminService.listarUsuarios(req.query);
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
            const dados = await AdminService.alternarBloqueio(
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
            const dados = await AdminService.removerUsuario(
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
            const dados = await AdminService.listarPostagens(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async removerPostagem(req, res, next) {
        try {
            const dados = await AdminService.removerPostagem(
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
            const dados = await AdminService.removerComentario(
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
            const dados = await AdminService.listarComentarios(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async vagas(req, res, next) {
        try {
            const dados = await AdminService.listarVagas(req.query);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async ocultarVaga(req, res, next) {
        try {
            const dados = await AdminService.alternarVisibilidadeVaga(
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
            const dados = await AdminService.relatorios();
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
