import { ChatbotConversa, ChatbotMensagem } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";

/**
 * Chatbot de suporte à acessibilidade.
 *
 * O histórico é persistido em chatbot_conversas / chatbot_mensagens,
 * sempre escopado ao usuário autenticado (anti-IDOR).
 * As respostas usam uma base de conhecimento local determinística —
 * nenhum dado do usuário sai da aplicação.
 */

const BASE_CONHECIMENTO = [
    {
        chaves: ["libras", "surdo", "surdez", "sinais"],
        resposta:
            "O ACESSO integra o VLibras. Clique no ícone de mãos no canto da tela para ativar a tradução em Libras de qualquer texto da plataforma."
    },
    {
        chaves: ["voz", "leitura", "ler", "audio", "cego", "cega"],
        resposta:
            "Ative a leitura por voz em Configurações > Acessibilidade. Na primeira ativação pedimos seu consentimento; depois é possível ajustar a velocidade da fala."
    },
    {
        chaves: ["contraste", "enxergar", "baixa visao", "fonte", "letra", "tamanho"],
        resposta:
            "Em Configurações > Acessibilidade você pode ativar alto contraste, aumentar a fonte até 200%, ampliar o espaçamento do texto e usar a fonte para dislexia."
    },
    {
        chaves: ["vaga", "vagas", "emprego", "trabalho", "candidatar"],
        resposta:
            "Acesse a página Vagas para filtrar por modalidade, tipo de deficiência atendida e vagas exclusivas para PCD. Clique em 'Candidatar-se' para enviar seu perfil à empresa."
    },
    {
        chaves: ["candidatura", "status", "andamento", "resultado"],
        resposta:
            "Acompanhe suas candidaturas no seu painel. Cada mudança de status (em análise, aprovada, recusada) gera uma notificação."
    },
    {
        chaves: ["curriculo", "perfil", "experiencia", "formacao", "habilidade"],
        resposta:
            "No seu perfil você cadastra experiências, formações, certificados e habilidades. Um perfil completo aumenta muito suas chances nas vagas inclusivas."
    },
    {
        chaves: ["empresa", "publicar", "anunciar", "recrutar"],
        resposta:
            "Empresas cadastradas podem publicar vagas, acompanhar candidatos e conversar pelo chat. O cadastro passa por aprovação da equipe do ACESSO."
    },
    {
        chaves: ["senha", "esqueci", "recuperar", "login", "entrar"],
        resposta:
            "Na tela de login use 'Esqueci minha senha'. Enviaremos um código de 6 dígitos válido por 15 minutos para redefinir o acesso."
    },
    {
        chaves: ["mensagem", "chat", "conversa", "falar"],
        resposta:
            "Use a área de Mensagens para conversar diretamente com empresas e candidatos. As conversas ficam salvas e indicam mensagens não lidas."
    }
];

const RESPOSTA_PADRAO =
    "Ainda não sei responder isso. Você pode perguntar sobre vagas, candidaturas, perfil, mensagens ou recursos de acessibilidade (Libras, leitura por voz, contraste e fonte). Se preferir, acesse a Central de Ajuda.";

const normalizar = (texto) =>
    String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

class ChatbotService {
    responder(pergunta) {
        const texto = normalizar(pergunta);

        const melhor = BASE_CONHECIMENTO.map((item) => ({
            pontos: item.chaves.filter((chave) => texto.includes(chave)).length,
            resposta: item.resposta
        }))
            .filter((item) => item.pontos > 0)
            .sort((a, b) => b.pontos - a.pontos)[0];

        return melhor ? melhor.resposta : RESPOSTA_PADRAO;
    }

    async listarConversas(solicitante, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await ChatbotConversa.findAndCountAll({
            where: { usuarioId: solicitante.id },
            limit: limite,
            offset,
            order: [["updated_at", "DESC"]]
        });

        return montarResposta("conversas", rows, count, pagina, limite);
    }

    /** Garante que a conversa existe e pertence ao usuário. */
    async garantirConversa(conversaId, solicitante, primeiraMensagem = null) {
        if (!conversaId) {
            return ChatbotConversa.create({
                usuarioId: solicitante.id,
                titulo: primeiraMensagem
                    ? String(primeiraMensagem).slice(0, 150)
                    : "Nova conversa"
            });
        }

        const conversa = await ChatbotConversa.findByPk(conversaId);

        if (!conversa) {
            throw ApiError.notFound("Conversa não encontrada.");
        }

        if (String(conversa.usuarioId) !== String(solicitante.id)) {
            throw ApiError.forbidden("Você não participa desta conversa.");
        }

        return conversa;
    }

    async historico(conversaId, solicitante, query) {
        await this.garantirConversa(conversaId, solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await ChatbotMensagem.findAndCountAll({
            where: { conversaId },
            limit: limite,
            offset,
            order: [["created_at", "ASC"]]
        });

        return montarResposta("mensagens", rows, count, pagina, limite);
    }

    async enviar({ conversaId, conteudo }, solicitante) {
        const pergunta = String(conteudo).trim();
        const conversa = await this.garantirConversa(
            conversaId,
            solicitante,
            pergunta
        );

        const mensagemUsuario = await ChatbotMensagem.create({
            conversaId: conversa.id,
            papel: "usuario",
            conteudo: pergunta
        });

        const mensagemBot = await ChatbotMensagem.create({
            conversaId: conversa.id,
            papel: "assistente",
            conteudo: this.responder(pergunta)
        });

        await conversa.changed("updated_at", true);
        await conversa.save();

        return {
            conversa,
            pergunta: mensagemUsuario,
            resposta: mensagemBot
        };
    }

    async remover(conversaId, solicitante) {
        const conversa = await this.garantirConversa(conversaId, solicitante);

        await conversa.destroy();

        return { mensagem: "Conversa removida." };
    }
}

export default new ChatbotService();
