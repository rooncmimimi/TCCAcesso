import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import { Usuario, CodigoRecuperacaoSenha } from "../models/index.js";
import { gerarCodigoNumerico, gerarTokenOpaco, hashToken, compararHash } from "../utils/tokens.js";
import { gerarHashSenha } from "../utils/bcrypt.js";
import SessaoService from "./SessaoService.js";
import EmailService from "./EmailService.js";
import NotificacaoPushService from "./NotificacaoPushService.js";
import AutenticacaoService from "./AutenticacaoService.js";
import { modeloRecuperacaoSenha } from "../utils/modelosEmail.js";
import { montarUrlFrontend } from "../utils/urlFrontend.js";
import ErroApi from "../utils/ErroApi.js";

const MINUTOS_VALIDADE = 15;
const MAX_TENTATIVAS = 5;
const MENSAGEM_INVALIDO = "Link ou código inválido ou expirado.";

/**
 * Recuperação de senha.
 *
 * Mecanismo principal: token opaco de alta entropia (48 bytes, `gerarTokenOpaco()`), entregue por
 * link no e-mail (`/redefinir-senha?token=...`). Não exige digitar nada, e o token não tem o espaço
 * de busca limitado (10^6) do código numérico.
 *
 * Alternativa: código de 6 dígitos, mantido porque é o único mecanismo que o app usa (não há deep
 * link de redefinição). Os dois segredos são gerados juntos e guardados na mesma linha, e usar um
 * invalida o outro.
 *
 * Segurança, nos dois mecanismos:
 * - resposta genérica ao solicitar (não revela se o e-mail existe);
 * - segredo guardado só como hash SHA-256, nunca em claro;
 * - expiração de 15 minutos e revogação de códigos e tokens anteriores;
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
            const { assunto, html, texto } = modeloRecuperacaoSenha({
                nome: usuario.nome,
                codigo,
                // O link carrega o token (mecanismo principal), e não e-mail e código: um clique
                // basta, e o código de 6 dígitos não aparece na URL, no histórico nem no referrer.
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
                // sempre a mesma genérica (anti-enumeração); o usuário
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
            // Sem provedor de e-mail, só fora de produção: o código e o link com o token vão para o
            // log, para o fluxo poder ser testado localmente.
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
     * Cada chamada usa exatamente um dos fluxos: `token` (o hash do token já identifica a linha,
     * sem `email` nem `codigo`) ou `email` e `codigo`.
     *
     * @param {object} dados
     * @param {string} [dados.token] Token opaco (mecanismo principal, link do e-mail).
     * @param {string} [dados.email] E-mail da conta (só no fluxo por código).
     * @param {string} [dados.codigo] Código de 6 dígitos (usado pelo app).
     * @param {string} dados.novaSenha
     */
    async redefinir({ token, email, codigo, novaSenha }) {
        if (token) {
            return this._redefinirComToken({ token, novaSenha });
        }

        const usuario = await Usuario.findOne({
            where: { email: String(email || "").toLowerCase().trim() }
        });

        if (!usuario) {
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
        }

        const registro = await CodigoRecuperacaoSenha.findOne({
            where: {
                usuarioId: usuario.id,
                utilizadoEm: null,
                expiraEm: { [Op.gt]: new Date() }
            },
            order: [["criadoEm", "DESC"]]
        });

        if (!registro) {
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
        }

        if (registro.tentativas >= MAX_TENTATIVAS) {
            await registro.update({ utilizadoEm: new Date() });
            throw ErroApi.requisicaoInvalida(
                "Número de tentativas excedido. Solicite um novo código."
            );
        }

        if (!compararHash(hashToken(codigo), registro.codigoHash)) {
            await registro.increment("tentativas");
            throw ErroApi.requisicaoInvalida("Código inválido ou expirado.");
        }

        await this._aplicarNovaSenha(usuario, registro, novaSenha);

        return { mensagem: "Senha redefinida com sucesso. Faça login novamente." };
    }

    /**
     * Fluxo principal: identifica a linha diretamente pelo hash do token
     * (sem precisar de e-mail) e, se válida, aplica a nova senha. Não há
     * limite de tentativas aqui de propósito: com 48 bytes aleatórios
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
            throw ErroApi.requisicaoInvalida(MENSAGEM_INVALIDO);
        }

        const usuario = await Usuario.findByPk(registro.usuarioId);

        if (!usuario) {
            throw ErroApi.requisicaoInvalida(MENSAGEM_INVALIDO);
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

            comSenha.senhaHash = await gerarHashSenha(novaSenha);
            // Invalida os access tokens emitidos antes desta redefinição, como na troca de senha
            // feita dentro da conta.
            comSenha.senhaAlteradaEm = new Date();
            await comSenha.save({ transaction });

            await registro.update({ utilizadoEm: new Date() }, { transaction });

            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        await SessaoService.revogarTodos(usuario.id);
        await NotificacaoPushService.removerTodosDoUsuario(usuario.id);
        await AutenticacaoService.avisarSenhaAlterada(usuario);
    }
}

export default new RecuperacaoSenhaService();
