import { verificarJwt, tokenAnteriorATrocaDeSenha } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";

/**
 * Autenticação via Bearer Token (JWT).
 *
 * Além de validar a assinatura, recarrega o usuário do banco para
 * garantir que ele ainda existe, continua ativo e que o token foi
 * emitido depois da última troca de senha: um token válido de um
 * usuário desativado não deve conceder acesso (OWASP A01/A07).
 */
const autenticacaoMiddleware = async (req, res, next) => {
    try {
        const cabecalhoAutorizacao = req.headers.authorization || "";
        const [esquema, token] = cabecalhoAutorizacao.split(" ");

        if (!token || esquema !== "Bearer") {
            throw ErroApi.naoAutenticado("Token não informado.");
        }

        let payload;

        try {
            payload = verificarJwt(token);
        } catch {
            throw ErroApi.naoAutenticado("Token inválido ou expirado.");
        }

        const usuario = await Usuario.findByPk(payload.id, {
            attributes: {
                exclude: ["senhaHash"]
            }
        });

        if (!usuario) {
            throw ErroApi.naoAutenticado("Usuário não encontrado.");
        }

        // `bloqueado` é checado antes de `ativo`: o bloqueio administrativo também desliga `ativo`,
        // e na ordem inversa toda conta bloqueada cairia no "Usuário desativado." genérico, sem
        // motivo. O `codigo` em `detalhes` permite ao cliente reconhecer o bloqueio sem comparar o
        // texto da mensagem.
        if (usuario.bloqueado) {
            throw ErroApi.acessoNegado(
                usuario.motivoBloqueio
                    ? `Sua conta foi bloqueada pela moderação do ACESSO. Motivo: ${usuario.motivoBloqueio}`
                    : "Sua conta foi bloqueada pela moderação do ACESSO.",
                { codigo: "CONTA_BLOQUEADA" }
            );
        }

        if (!usuario.ativo) {
            throw ErroApi.acessoNegado("Usuário desativado.");
        }

        // Trocar ou redefinir a senha revoga as sessões e invalida os access tokens já emitidos. O
        // cliente trata este 401 como sessão encerrada e volta para o login.
        if (tokenAnteriorATrocaDeSenha(payload, usuario)) {
            throw ErroApi.naoAutenticado("Sua senha foi alterada. Entre novamente.", {
                codigo: "SENHA_ALTERADA"
            });
        }

        req.user = usuario;

        return next();
    } catch (erro) {
        return next(erro);
    }
};

export default autenticacaoMiddleware;
