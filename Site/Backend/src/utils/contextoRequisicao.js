/**
 * Dados da requisição gravados na auditoria administrativa junto com cada ação.
 */
export const contextoRequisicao = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    // Token do dispositivo de confiança que o Site guarda (veja `DispositivoConfiavelService`). Nunca é registrado.
    dispositivo: req.headers["x-dispositivo"]
});
