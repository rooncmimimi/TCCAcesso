import ApiError from "../utils/ApiError.js";

/**
 * Controle de acesso baseado em papéis (RBAC).
 *
 * Os papéis seguem o ENUM `tipo_usuario` do banco:
 * 'candidato' | 'empresa' | 'administrador'.
 *
 * Uso: rbacMiddleware("administrador", "empresa")
 */
const rbacMiddleware = (...papeis) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized("Usuário não autenticado."));
        }

        if (papeis.length > 0 && !papeis.includes(req.user.tipoUsuario)) {
            return next(
                ApiError.forbidden(
                    "Você não possui permissão para esta ação."
                )
            );
        }

        return next();
    };
};

export default rbacMiddleware;
