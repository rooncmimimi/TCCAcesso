import { verificarJwt, tokenAnteriorATrocaDeSenha } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";
import TotpService from "../services/TotpService.js";
import SessaoService from "../services/SessaoService.js";
import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";

const MENSAGENS_MFA = {
    nao_configurado: {
        mensagem: "Administradores precisam ativar a verificação em duas etapas antes de usar esta função.",
        codigo: "MFA_NAO_CONFIGURADO"
    },
    necessario: {
        mensagem: "Confirme a verificação em duas etapas para continuar. Entre novamente.",
        codigo: "MFA_NECESSARIO"
    }
};

/**
 * Autenticação via Bearer Token (JWT).
 *
 * Além de validar a assinatura, recarrega o usuário do banco para
 * garantir que ele ainda existe, continua ativo e que o token foi
 * emitido depois da última troca de senha: um token válido de um
 * usuário desativado não deve conceder acesso (OWASP A01/A07).
 *
 * **Verificação em duas etapas.** Administrador só passa se o TOTP estiver configurado e esta sessão tiver
 * passado pelo segundo fator (`TotpService.estadoDoAcesso`). É a regra padrão de toda rota que usa este
 * middleware: o servidor nega, e não o Site que esconde um botão. As poucas rotas que o administrador
 * ainda sem TOTP precisa alcançar (`/auth/me`, `/auth/logout` e as de configuração) usam
 * `autenticacaoSemExigirMfa`, que deixa o estado em `req.mfaEstado`.
 */
export function criarAutenticacaoMiddleware({ permitirMfaPendente = false } = {}) {
    return async (req, res, next) => {
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

            // Encerrar a sessão (ou sair) vale na hora: o access token leva o `sid` do login, e o login precisa seguir ativo.
            // Token sem `sid` (emitido antes de a migration 0009 entrar em uso) vale até expirar, como sempre valeu.
            if (env.sessoes.dispositivosHabilitado && payload.sid) {
                if (!(await SessaoService.familiaViva(usuario.id, payload.sid))) {
                    throw ErroApi.naoAutenticado("Esta sessão foi encerrada. Entre novamente.", {
                        codigo: "SESSAO_ENCERRADA"
                    });
                }

                req.sessaoFamiliaId = payload.sid;
            }

            const estadoMfa = await TotpService.estadoDoAcesso(usuario, payload);

            if (estadoMfa !== "ok" && !permitirMfaPendente) {
                const { mensagem, codigo } = MENSAGENS_MFA[estadoMfa];

                throw ErroApi.acessoNegado(mensagem, { codigo });
            }

            req.user = usuario;
            req.mfaEstado = estadoMfa;

            return next();
        } catch (erro) {
            return next(erro);
        }
    };
}

const autenticacaoMiddleware = criarAutenticacaoMiddleware();

export const autenticacaoSemExigirMfa = criarAutenticacaoMiddleware({ permitirMfaPendente: true });

export default autenticacaoMiddleware;
