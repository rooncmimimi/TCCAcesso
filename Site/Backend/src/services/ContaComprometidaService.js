import { Op } from "sequelize";

import sequelize from "../config/bancoDeDados.js";
import { LinkDeSeguranca, Usuario } from "../models/index.js";
import DispositivoConfiavelService from "./DispositivoConfiavelService.js";
import EmailService from "./EmailService.js";
import RecuperacaoSenhaService from "./RecuperacaoSenhaService.js";
import SegurancaEventosService from "./SegurancaEventosService.js";
import SessaoService from "./SessaoService.js";
import ErroApi from "../utils/ErroApi.js";
import { compararSenha } from "../utils/bcrypt.js";
import { emailCanonico } from "../utils/email.js";
import { modeloContaProtegida, modeloLinkContaComprometida } from "../utils/modelosEmail.js";
import { gerarTokenOpaco, hashToken } from "../utils/tokens.js";
import { montarUrlFrontend } from "../utils/urlFrontend.js";

const MINUTOS_DO_LINK = 60;
/** Entre dois pedidos de link para a mesma conta: impede encher a caixa de entrada de quem só teve o e-mail digitado por outra pessoa. */
const MINUTOS_ENTRE_LINKS = 5;

const RESPOSTA_GENERICA = {
    mensagem: "Se existe uma conta com este e-mail, enviamos um link para protegê-la. Ele vale por 1 hora."
};

/**
 * Recuperação de conta comprometida.
 *
 * O que a proteção faz (e o que **nunca** faz):
 * - encerra **todas** as sessões, invalida os access tokens já emitidos e remove a confiança dos dispositivos;
 * - avisa por e-mail e manda o link de nova senha;
 * - **não** desliga a verificação em duas etapas: quem tomasse a caixa de e-mail não pode usar este caminho para tirar a
 *   segunda camada de um administrador.
 *
 * O link só chega ao e-mail da conta (é ele que prova o controle). A resposta ao pedido público é sempre a mesma, exista a
 * conta ou não, para não revelar quem tem cadastro.
 */
class ContaComprometidaService {
    /** Pedido público: "acho que invadiram minha conta". Resposta sempre genérica. */
    async solicitar(email, contexto = {}) {
        const usuario = await Usuario.findOne({ where: { email: emailCanonico(email) } });

        if (!usuario || !usuario.ativo || usuario.bloqueado) {
            return RESPOSTA_GENERICA;
        }

        const recente = await LinkDeSeguranca.findOne({
            where: {
                usuarioId: usuario.id,
                tipo: "comprometida",
                utilizadoEm: null,
                criadoEm: { [Op.gt]: new Date(Date.now() - MINUTOS_ENTRE_LINKS * 60 * 1000) }
            }
        });

        if (recente) {
            return RESPOSTA_GENERICA;
        }

        const token = gerarTokenOpaco(48);

        await LinkDeSeguranca.create({
            usuarioId: usuario.id,
            tipo: "comprometida",
            tokenHash: hashToken(token),
            expiraEm: new Date(Date.now() + MINUTOS_DO_LINK * 60 * 1000),
            ip: contexto.ip ? String(contexto.ip).slice(0, 64) : null
        });

        await SegurancaEventosService.registrar(usuario.id, "link_de_seguranca_enviado", contexto);

        try {
            const { assunto, html, texto } = modeloLinkContaComprometida({
                nome: usuario.nome,
                link: montarUrlFrontend("/conta-comprometida", { token }),
                minutosValidade: MINUTOS_DO_LINK
            });

            await EmailService.enviar({ para: usuario.email, nomeDestinatario: usuario.nome, assunto, html, texto, tag: "conta-comprometida" });
        } catch (erro) {
            // A resposta continua genérica (não revela se a conta existe); a falha fica no log.
            console.error(JSON.stringify({ nivel: "error", servico: "ContaComprometidaService", acao: "enviar_link", causa: erro.message }));
        }

        return RESPOSTA_GENERICA;
    }

    /**
     * Confirma pelo link (do pedido público ou do "Não fui eu" do e-mail de novo acesso): protege a conta. O link vale uma vez.
     */
    async confirmar(token, contexto = {}) {
        const erroDeLink = () =>
            ErroApi.requisicaoInvalida("Este link expirou ou já foi usado. Peça um novo na tela de entrada.", { codigo: "LINK_DE_SEGURANCA_INVALIDO" });

        if (!token || typeof token !== "string" || token.length > 200) {
            throw erroDeLink();
        }

        const transaction = await sequelize.transaction();
        let usuario;

        try {
            const link = await LinkDeSeguranca.findOne({
                where: { tokenHash: hashToken(token) },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!link || link.utilizadoEm || new Date(link.expiraEm) <= new Date()) {
                await transaction.rollback();
                throw erroDeLink();
            }

            usuario = await Usuario.findByPk(link.usuarioId, { transaction });

            if (!usuario) {
                await transaction.rollback();
                throw erroDeLink();
            }

            await link.update({ utilizadoEm: new Date() }, { transaction });

            // Todos os access tokens emitidos antes deste instante deixam de valer, sem esperar os 30 minutos.
            await Usuario.update({ senhaAlteradaEm: new Date() }, { where: { id: usuario.id }, transaction });
            await SessaoService.revogarTodos(usuario.id, { transaction });
            await DispositivoConfiavelService.revogarTodos(usuario.id, { transaction });
            await SegurancaEventosService.registrar(usuario.id, "conta_protegida_por_link", contexto, { origem: link.tipo }, { transaction });

            await transaction.commit();
        } catch (erro) {
            if (!transaction.finished) {
                await transaction.rollback();
            }

            throw erro;
        }

        await this.avisarEMandarNovaSenha(usuario, contexto);

        return {
            mensagem: "Sua conta foi protegida: todas as sessões foram encerradas. Enviamos um link para você criar uma nova senha.",
            proximoPasso: "redefinir-senha"
        };
    }

    /** Depois de proteger: avisa por e-mail e envia o link de nova senha. Nunca desfaz a proteção se o e-mail falhar. */
    async avisarEMandarNovaSenha(usuario, contexto) {
        try {
            const { assunto, html, texto } = modeloContaProtegida({ nome: usuario.nome });

            await EmailService.enviar({ para: usuario.email, nomeDestinatario: usuario.nome, assunto, html, texto, tag: "conta-protegida" });
        } catch (erro) {
            console.error(JSON.stringify({ nivel: "error", servico: "ContaComprometidaService", acao: "avisar", causa: erro.message }));
        }

        try {
            await RecuperacaoSenhaService.solicitar(usuario.email, contexto);
        } catch (erro) {
            console.error(JSON.stringify({ nivel: "error", servico: "ContaComprometidaService", acao: "enviar_nova_senha", causa: erro.message }));
        }
    }

    /**
     * Logado e desconfiado: encerra as OUTRAS sessões e a confiança nos dispositivos, sem derrubar a sessão de quem pediu. Pede a
     * senha atual (quando a conta tem) para um aparelho esquecido logado não conseguir usar isto. Depois, o Site leva à troca de senha.
     */
    async protegerAgora(usuario, { senhaAtual }, { familiaId = null, tokenAtual = null } = {}, contexto = {}) {
        const comSenha = await Usuario.scope("comSenha").findByPk(usuario.id, { attributes: ["id", "senhaHash"] });

        if (comSenha?.senhaHash) {
            const confere = Boolean(senhaAtual) && (await compararSenha(senhaAtual, comSenha.senhaHash));

            if (!confere) {
                throw ErroApi.naoAutenticado("Senha atual incorreta.");
            }
        }

        await SessaoService.revogarTodosExceto(usuario.id, { familiaId, tokenAtual });
        await DispositivoConfiavelService.revogarTodos(usuario.id);
        await SegurancaEventosService.registrar(usuario.id, "conta_protegida_agora", contexto);

        try {
            const { assunto, html, texto } = modeloContaProtegida({ nome: usuario.nome });

            await EmailService.enviar({ para: usuario.email, nomeDestinatario: usuario.nome, assunto, html, texto, tag: "conta-protegida" });
        } catch (erro) {
            console.error(JSON.stringify({ nivel: "error", servico: "ContaComprometidaService", acao: "avisar", causa: erro.message }));
        }

        return {
            mensagem: "As outras sessões foram encerradas e a confiança nos dispositivos foi removida. Troque a sua senha agora.",
            proximoPasso: "trocar-senha"
        };
    }
}

export default new ContaComprometidaService();
