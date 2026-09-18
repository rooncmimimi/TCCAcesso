/**
 * Dados da requisição gravados na auditoria administrativa junto com cada ação.
 */
export const contextoRequisicao = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});
