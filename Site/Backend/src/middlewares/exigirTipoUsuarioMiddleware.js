import ErroApi from "../utils/ErroApi.js";

/**
 * Controle de acesso baseado em papéis (RBAC).
 *
 * Os papéis seguem o ENUM `tipo_usuario` do banco:
 * 'candidato' | 'empresa' | 'administrador'.
 *
 * Uso: exigirTipoUsuarioMiddleware("administrador", "empresa")
 */
const exigirTipoUsuarioMiddleware = (...papeis) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ErroApi.naoAutenticado("Usuário não autenticado."));
        }

        if (papeis.length > 0 && !papeis.includes(req.user.tipoUsuario)) {
            return next(
                ErroApi.acessoNegado(
                    "Você não possui permissão para esta ação."
                )
            );
        }

        return next();
    };
};

export default exigirTipoUsuarioMiddleware;
