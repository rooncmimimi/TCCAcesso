import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Usuario, CodigoRecuperacaoSenha } from "../models/index.js";
import { gerarCodigoNumerico, gerarTokenOpaco, hashToken, compararHash } from "../utils/tokens.js";
import { hashPassword } from "../utils/bcrypt.js";
import RefreshTokenService from "./RefreshTokenService.js";
import EmailService from "./EmailService.js";
import authService from "./authService.js";
import { templateRecuperacaoSenha } from "../utils/emailTemplates.js";
import { montarUrlFrontend } from "../utils/frontendUrl.js";
import ApiError from "../utils/ApiError.js";

const MINUTOS_VALIDADE = 15;
const MAX_TENTATIVAS = 5;
const MENSAGEM_INVALIDO = "Link ou código inválido ou expirado.";

/**
 * Recuperação de senha.
 *
 * Mecanismo PRINCIPAL: token opaco de alta entropia (48 bytes,
 * `gerarTokenOpaco()`), entregue por link no e-mail
 * (`/redefinir-senha?token=...`) — não exige digitar nada, e o token não
 * tem o espaço de busca limitado (10^6) do código numérico.
 *
 * Mecanismo de FALLBACK: código de 6 dígitos, mantido porque é o único
 * mecanismo que o aplicativo mobile usa (sem deep link de redefinição).
 * Os dois segredos são gerados juntos e guardados na MESMA linha —
 * resgatar um invalida o outro (auditoria do Site, item 1).
 *
 * Segurança (ambos os mecanismos):
 * - resposta genérica ao solicitar (não revela se o e-mail existe — anti-enumeração);
 * - segredo guardado só como hash (SHA-256), nunca em claro;
 * - expiração de 15 minutos e revogação de códigos/tokens anteriores;
 * - comparação em tempo constante; ao redefinir, todas as sessões do usuário são revogadas.
 */
class RecuperacaoSenhaService {
    async solicitar(email, contexto = {}) {
        const generico = {
            mensagem:
                "Se encontrarmos uma conta associada a este endereço, enviaremos as instruções para recuperação."
        };

        const usuario = await Usuario.findOne({
            where: { email: String(email || "").toLowerCase().trim() }
        });

        if (!usuario || !usuario.ativo) {
            return generico;
        }

        // Invalida códigos/tokens anteriores ainda válidos.
        await CodigoRecuperacaoSenha.update(
            { utilizadoEm: new Date() },
            { where: { usuarioId: usuario.id, utilizadoEm: null } }
        );

        const codigo = gerarCodigoNumerico(6);
        const token = gerarTokenOpaco(48);
        const expiraEm = new Date(Date.now() + MINUTOS_VALIDADE * 60 * 1000);

        await CodigoRecuperacaoSenha.create({
            usuarioId: usuario.id,
            codigoHash: hashToken(codigo),
            tokenHash: hashToken(token),
            expiraEm,
            ipSolicitante: contexto.ip ? String(contexto.ip).slice(0, 64) : null
        });

        if (EmailService.disponivel()) {
            const { assunto, html, texto } = templateRecuperacaoSenha({
                nome: usuario.nome,
                codigo,
                // O link agora carrega o TOKEN (mecanismo principal) — não o
                // e-mail/código. Um clique já é suficiente, sem digitar nada,
                // e não expõe o código de 6 dígitos na URL/histórico/referrer.
                linkRedefinir: montarUrlFrontend("/redefinir-senha", { token }),
                minutosValidade: MINUTOS_VALIDADE
            });

            try {
                await EmailService.enviar({
                    para: usuario.email,
                    nomeDestinatario: usuario.nome,
                    assunto,
                    html,
                    texto,
                    tag: "recuperacao-senha"
                });
            } catch (erro) {
                // Best-effort, igual ao cadastro: a resposta ao cliente é
                // sempre a mesma genérica (anti-enumeração) — o usuário
                // pode simplesmente solicitar de novo.
                console.error(
                    JSON.stringify({
                        nivel: "error",
                        servico: "RecuperacaoSenhaService",
                        acao: "envio_codigo_recuperacao",
                        usuarioId: usuario.id,
                        erro: erro.message
                    })
                );
            }
        } else if (process.env.NODE_ENV !== "production") {
            // Sem provedor de e-mail configurado: mantém o fallback só de
            // desenvolvimento (nunca em produção) que já existia antes —
            // agora também loga o link com o token (mecanismo principal),
            // sem o qual esse fluxo não seria testável localmente sem um
            // provedor de e-mail configurado.
            console.info(
                `[RECUPERACAO] Código para ${usuario.email}: ${codigo} (expira em ${MINUTOS_VALIDADE} min)`
            );
            console.info(
                `[RECUPERACAO] Link para ${usuario.email}: ${montarUrlFrontend("/redefinir-senha", { token })}`
            );
        }

        return generico;
    }

    /**
     * @param {object} dados
     * @param {string} [dados.token] Token opaco (mecanismo principal, link de e-mail).
     * @param {string} [dados.email] E-mail da conta (só usado no fluxo por código).
     * @param {string} [dados.codigo] Código de 6 dígitos (fallback, usado pelo app mobile).
     * @param {string} dados.novaSenha
     *
     * Exatamente um dos dois fluxos é usado por chamada: `token` (não
     * precisa de `email`/`codigo` — o hash do token já identifica a linha
     * sozinho) ou `email`+`codigo` (fluxo original, inalterado).
     */
    async redefinir({ token, email, codigo, novaSenha }) {
        if (token) {
            return this._redefinirComToken({ token, novaSenha });
        }

        const usuario = await Usuario.findOne({
            where: { email: String(email || "").toLowerCase().trim() }
        });

        if (!usuario) {
            throw ApiError.badRequest("Código inválido ou expirado.");
        }

        const registro = await CodigoRecuperacaoSenha.findOne({
            where: {
                usuarioId: usuario.id,
                utilizadoEm: null,
                expiraEm: { [Op.gt]: new Date() }
            },
            order: [["created_at", "DESC"]]
        });

        if (!registro) {
            throw ApiError.badRequest("Código inválido ou expirado.");
        }

        if (registro.tentativas >= MAX_TENTATIVAS) {
            await registro.update({ utilizadoEm: new Date() });
            throw ApiError.badRequest(
                "Número de tentativas excedido. Solicite um novo código."
            );
        }

        if (!compararHash(hashToken(codigo), registro.codigoHash)) {
            await registro.increment("tentativas");
            throw ApiError.badRequest("Código inválido ou expirado.");
        }

        await this._aplicarNovaSenha(usuario, registro, novaSenha);

        return { mensagem: "Senha redefinida com sucesso. Faça login novamente." };
    }

    /**
     * Fluxo principal: identifica a linha diretamente pelo hash do token
     * (sem precisar de e-mail) e, se válida, aplica a nova senha. Não há
     * limite de tentativas aqui de propósito — com 48 bytes aleatórios
     * (2^384 combinações) um atacante não tem como "tentar de novo" com
     * qualquer chance prática de acerto, diferente do código de 6 dígitos
     * (10^6 combinações), que por isso continua limitado a 5 tentativas.
     */
    async _redefinirComToken({ token, novaSenha }) {
        const registro = await CodigoRecuperacaoSenha.findOne({
            where: {
                tokenHash: hashToken(token),
                utilizadoEm: null,
                expiraEm: { [Op.gt]: new Date() }
            }
        });

        if (!registro) {
            throw ApiError.badRequest(MENSAGEM_INVALIDO);
        }

        const usuario = await Usuario.findByPk(registro.usuarioId);

        if (!usuario) {
            throw ApiError.badRequest(MENSAGEM_INVALIDO);
        }

        await this._aplicarNovaSenha(usuario, registro, novaSenha);

        return { mensagem: "Senha redefinida com sucesso. Faça login novamente." };
    }

    /** Lógica comum aos dois fluxos: troca a senha, marca a linha como usada, revoga sessões e avisa o usuário. */
    async _aplicarNovaSenha(usuario, registro, novaSenha) {
        const transaction = await sequelize.transaction();

        try {
            const comSenha = await Usuario.scope("comSenha").findByPk(
                usuario.id,
                { transaction }
            );

            comSenha.senhaHash = await hashPassword(novaSenha);
            await comSenha.save({ transaction });

            await registro.update({ utilizadoEm: new Date() }, { transaction });

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        await RefreshTokenService.revogarTodos(usuario.id);
        await authService.avisarSenhaAlterada(usuario);
    }
}

export default new RecuperacaoSenhaService();
