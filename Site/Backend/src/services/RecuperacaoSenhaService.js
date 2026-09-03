import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Usuario, CodigoRecuperacaoSenha } from "../models/index.js";
import { gerarCodigoNumerico, hashToken, compararHash } from "../utils/tokens.js";
import { hashPassword } from "../utils/bcrypt.js";
import RefreshTokenService from "./RefreshTokenService.js";
import EmailService from "./EmailService.js";
import authService from "./authService.js";
import { templateRecuperacaoSenha } from "../utils/emailTemplates.js";
import { montarUrlFrontend } from "../utils/frontendUrl.js";
import ApiError from "../utils/ApiError.js";

const MINUTOS_VALIDADE = 15;
const MAX_TENTATIVAS = 5;

/**
 * Recuperação de senha por código de 6 dígitos.
 *
 * Segurança:
 * - resposta genérica (não revela se o e-mail existe — anti-enumeração);
 * - código guardado como hash, com expiração e limite de tentativas;
 * - ao redefinir, todas as sessões do usuário são revogadas.
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

        // Invalida códigos anteriores ainda válidos.
        await CodigoRecuperacaoSenha.update(
            { utilizadoEm: new Date() },
            { where: { usuarioId: usuario.id, utilizadoEm: null } }
        );

        const codigo = gerarCodigoNumerico(6);
        const expiraEm = new Date(Date.now() + MINUTOS_VALIDADE * 60 * 1000);

        await CodigoRecuperacaoSenha.create({
            usuarioId: usuario.id,
            codigoHash: hashToken(codigo),
            expiraEm,
            ipSolicitante: contexto.ip ? String(contexto.ip).slice(0, 64) : null
        });

        if (EmailService.disponivel()) {
            const { assunto, html, texto } = templateRecuperacaoSenha({
                nome: usuario.nome,
                codigo,
                linkRedefinir: montarUrlFrontend("/redefinir-senha", {
                    email: usuario.email,
                    codigo
                }),
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
            // desenvolvimento (nunca em produção) que já existia antes.
            console.info(
                `[RECUPERACAO] Código para ${usuario.email}: ${codigo} (expira em ${MINUTOS_VALIDADE} min)`
            );
        }

        return generico;
    }

    async redefinir({ email, codigo, novaSenha }) {
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

        return { mensagem: "Senha redefinida com sucesso. Faça login novamente." };
    }
}

export default new RecuperacaoSenhaService();
