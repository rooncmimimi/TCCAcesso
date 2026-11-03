import { verificarJwt } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";
import TotpService from "../services/TotpService.js";
import SessaoService from "../services/SessaoService.js";
import env from "../config/env.js";

/**
 * Variante opcional do `autenticacaoMiddleware`, para rotas públicas que precisam saber quem está
 * pedindo (para aplicar privacidade e bloqueio) sem exigir login, como o perfil de empresa e o
 * detalhe de vaga. Com um token válido, preenche `req.user` normalmente; sem token, ou com token
 * inválido, segue sem erro e `req.user` fica `undefined` (visitante anônimo).
 *
 * Administrador sem o TOTP configurado e verificado também segue como visitante: o poder de
 * administrador não vale em rota pública antes do segundo fator, do mesmo jeito que não vale nas
 * protegidas.
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

        // Sessão encerrada não é reconhecida nem em rota pública.
        const sessaoViva =
            !env.sessoes.dispositivosHabilitado || !payload.sid || (await SessaoService.familiaViva(usuario?.id, payload.sid));

        if (usuario && sessaoViva && usuario.ativo && !usuario.bloqueado && (await TotpService.estadoDoAcesso(usuario, payload)) === "ok") {
            req.user = usuario;
        }

        return next();
    } catch {
        // Token ausente/inválido em rota pública não é erro: segue anônimo.
        return next();
    }
};

export default autenticacaoOpcionalMiddleware;
