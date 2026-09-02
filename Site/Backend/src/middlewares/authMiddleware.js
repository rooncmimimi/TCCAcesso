import { verifyToken } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

/**
 * Autenticação via Bearer Token (JWT).
 *
 * Além de validar a assinatura, recarrega o usuário do banco para
 * garantir que ele ainda existe e continua ativo — um token válido
 * de um usuário desativado NÃO deve conceder acesso (OWASP A01/A07).
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
        const [esquema, token] = authHeader.split(" ");

        if (!token || esquema !== "Bearer") {
            throw ApiError.unauthorized("Token não informado.");
        }

        let payload;

        try {
            payload = verifyToken(token);
        } catch {
            throw ApiError.unauthorized("Token inválido ou expirado.");
        }

        const usuario = await Usuario.findByPk(payload.id, {
            attributes: {
                exclude: ["senhaHash"]
            }
        });

        if (!usuario) {
            throw ApiError.unauthorized("Usuário não encontrado.");
        }

        // Fase 9 (Bloco 3): checa `bloqueado` ANTES de `ativo` — hoje
        // `alternarBloqueio` sempre seta os dois juntos
        // (`ativo: !bloqueado`), então checar `ativo` primeiro fazia essa
        // ramificação nunca ser alcançada de verdade: toda conta bloqueada
        // caía no "Usuário desativado." genérico, sem motivo nenhum,
        // idêntico ao texto que uma conta pausada pelo próprio usuário
        // também poderia gerar no futuro. `codigo` em `detalhes` permite o
        // frontend identificar este caso especificamente (bloqueio
        // administrativo), sem depender de comparar o texto da mensagem.
        if (usuario.bloqueado) {
            throw ApiError.forbidden(
                usuario.motivoBloqueio
                    ? `Sua conta foi bloqueada pela moderação do ACESSO. Motivo: ${usuario.motivoBloqueio}`
                    : "Sua conta foi bloqueada pela moderação do ACESSO.",
                { codigo: "CONTA_BLOQUEADA" }
            );
        }

        if (!usuario.ativo) {
            throw ApiError.forbidden("Usuário desativado.");
        }

        req.user = usuario;

        return next();
    } catch (erro) {
        return next(erro);
    }
};

export default authMiddleware;
