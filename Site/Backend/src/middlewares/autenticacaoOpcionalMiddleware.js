import { verificarJwt } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";

/**
 * Variante opcional do `autenticacaoMiddleware`, para rotas públicas que precisam saber quem está
 * pedindo (para aplicar privacidade e bloqueio) sem exigir login, como o perfil de empresa e o
 * detalhe de vaga. Com um token válido, preenche `req.user` normalmente; sem token, ou com token
 * inválido, segue sem erro e `req.user` fica `undefined` (visitante anônimo).
 */
const autenticacaoOpcionalMiddleware = async (req, res, next) => {
    try {
        const cabecalhoAutorizacao = req.headers.authorization || "";
        const [esquema, token] = cabecalhoAutorizacao.split(" ");

        if (!token || esquema !== "Bearer") {
            return next();
        }

        const payload = verificarJwt(token);

        const usuario = await Usuario.findByPk(payload.id, {
            attributes: {
                exclude: ["senhaHash"]
            }
        });

        if (usuario && usuario.ativo && !usuario.bloqueado) {
            req.user = usuario;
        }

        return next();
    } catch {
        // Token ausente/inválido em rota pública não é erro: segue anônimo.
        return next();
    }
};

export default autenticacaoOpcionalMiddleware;
