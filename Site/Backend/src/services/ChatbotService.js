import { ChatbotConversa, ChatbotMensagem } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";

/**
 * Chatbot de suporte — assistente da Central de Ajuda.
 *
 * O histórico é persistido em chatbot_conversas / chatbot_mensagens,
 * sempre escopado ao usuário autenticado (anti-IDOR). As respostas usam
 * uma base de conhecimento local determinística — nenhum dado do
 * usuário sai da aplicação, nenhuma IA externa, nenhuma alucinação.
 *
 * Duas formas de casar uma pergunta com um tópico:
 *
 * 1. `chaves`: lista de substrings. Usadas em RADICAL (não palavra
 *    completa) quando isso resolve conjugação em português sem colisão
 *    — ex.: "denunc" casa com "denunciar"/"denuncio"/"denúncia". Um
 *    prefixo com `\b` (limite de palavra) evita casar dentro de outra
 *    palavra que só por acaso contém o radical (ex.: "ativ" sozinho
 *    casaria com "desativar" — por isso "ativar" abaixo usa `\bativ`).
 * 2. `regex`: para quando o radical sozinho colidiria com outra coisa
 *    (ex.: "public" colide com "publicação") ou quando o tópico só faz
 *    sentido com duas palavras próximas (verbo + "vaga").
 *
 * A comparação roda sobre texto sem acento e minúsculo (`normalizar`),
 * então nenhuma chave usa acento.
 */
const BASE_CONHECIMENTO = [
    // ---------- Conta ----------
    {
        chaves: ["criar conta", "criar uma conta", "cadastr", "me cadastrar", "fazer meu cadastro"],
        resposta:
            "Na tela de Cadastro, escolha se você é candidato ou empresa e preencha os dados pedidos. O acesso é liberado imediatamente após o cadastro."
    },
    {
        chaves: ["login", "fazer login", "entrar na minha conta", "acessar minha conta"],
        resposta:
            "Na tela de Entrar, informe seu e-mail e senha cadastrados. Se esqueceu a senha, toque em 'Esqueci minha senha' na mesma tela."
    },
    {
        chaves: ["esqueci", "recuperar senha", "esqueci minha senha", "recuperar minha senha"],
        resposta:
            "Na tela de Entrar, toque em 'Esqueci minha senha'. Você recebe um código de 6 dígitos por e-mail, válido por 15 minutos, para definir uma nova senha."
    },
    {
        chaves: ["alterar minha senha", "trocar minha senha", "mudar minha senha", "alterar senha"],
        resposta:
            "Em Configurações > Segurança você altera sua senha atual — basta informar a senha antiga e a nova."
    },
    {
        regex: /\blogout\b|sa(ir|io)\s+da\s+(minha\s+)?conta|fazer logout|encerrar (a )?sessao/,
        resposta:
            "Para sair da sua conta, abra o menu do seu perfil (sua foto, no topo da tela) e escolha 'Sair'."
    },
    {
        chaves: [
            "excluir conta", "excluir minha conta", "deletar conta", "deletar minha conta",
            "cancelar conta", "cancelar minha conta", "encerrar conta", "encerrar minha conta",
            "pausar conta", "pausar minha conta"
        ],
        resposta:
            "Em Configurações > Conta você encontra as opções de pausar ou excluir sua conta. A exclusão pede sua senha atual e é permanente."
    },
    {
        chaves: ["2fa", "dois fatores", "duas etapas"],
        resposta:
            "Ative a verificação em duas etapas em Configurações > Segurança. Você vai escanear um QR code com um aplicativo autenticador e confirmar um código antes de ativar."
    },

    // ---------- Perfil ----------
    {
        chaves: [
            "curriculo", "experiencia", "formacao", "habilidade", "certificad",
            "alterar meu perfil", "editar meu perfil", "editar perfil",
            "ver meu perfil", "visualizar meu perfil", "editar minhas informacoes",
            "alterar minhas informacoes", "mudar meu titulo", "alterar meu titulo",
            "alterar meus dados", "mudar meus dados", "altero meus dados"
        ],
        resposta:
            "No seu perfil você edita foto, capa, biografia, título profissional e cadastra experiências, formações, certificados, habilidades e o currículo (tudo em 'Editar perfil'). O arquivo do currículo fica em armazenamento privado — só você, a equipe do ACESSO e empresas com uma candidatura sua conseguem acessá-lo."
    },
    {
        chaves: ["ver perfil de outra pessoa", "visualizar outro perfil", "ver o perfil de"],
        resposta:
            "Toque no nome ou na foto da pessoa em qualquer publicação, vaga ou resultado de busca para abrir o perfil dela."
    },
    {
        // "sigo" é a conjugação em primeira pessoa de "seguir" — sem o
        // regex, "como sigo uma empresa" não bate com "seguir uma empresa".
        chaves: ["seguir alguem", "seguir uma pessoa", "seguir um perfil", "seguir uma empresa"],
        regex: /\bsigo\s+(uma\s+|um\s+)?(pessoa|empresa|perfil)/,
        resposta:
            "No perfil de uma pessoa ou empresa, toque em 'Seguir'. Não é preciso aceite — diferente de um pedido de conexão, seguir é imediato."
    },
    {
        chaves: ["deixar de seguir", "parar de seguir", "deixo de seguir"],
        resposta:
            "No perfil de quem você segue, toque novamente no botão (agora 'Seguindo') para deixar de seguir."
    },
    {
        chaves: [
            "descobrir pessoas", "descobrir empresas", "encontrar pessoas", "encontrar empresas",
            "encontrar novas pessoas", "sugestao de pessoas", "sugestao de empresas", "pagina descobrir"
        ],
        resposta:
            "Em 'Descobrir', no menu do seu perfil, o ACESSO sugere pessoas e empresas para seguir com base em cidade, área profissional, empresas de vagas que você favoritou e interações públicas — nunca com base em deficiência, diagnóstico ou qualquer dado sensível."
    },
    {
        regex: /por\s?que\s[\s\S]*(apareceu|aparece|sugeri\w*)[\s\S]*(pra\s+mim|para\s+mim)?|motivo\s+d[ae]\s+sugest/,
        resposta:
            "Cada sugestão em 'Descobrir' mostra o motivo ao lado (mesma cidade, mesma área, empresa de uma vaga que você favoritou, etc.) — nunca é um cálculo escondido, e nunca usa deficiência ou diagnóstico como critério."
    },

    // ---------- Vagas ----------
    {
        regex: /diferenca\w*.*(aprovad\w*|verificad\w*)|(aprovad\w*.*verificad\w*)|(verificad\w*.*aprovad\w*)/,
        resposta:
            "São conceitos diferentes: 'aprovada' significa que a empresa passou pela checagem cadastral e já pode publicar vagas; 'verificada' é um selo adicional de confiança concedido pela equipe do ACESSO, independente da aprovação."
    },
    {
        chaves: ["empresa verificada", "selo verificad", "o que significa verificada"],
        resposta:
            "O selo 'Verificada' é concedido pela equipe do ACESSO e é diferente de 'aprovada' (que só permite publicar vagas). Uma empresa verificada passou por uma checagem adicional de confiança."
    },
    {
        chaves: ["empresa aprovada", "o que significa aprovada"],
        resposta:
            "Uma empresa aprovada passou pela checagem cadastral da equipe do ACESSO e já pode publicar vagas. Isso é diferente do selo 'Verificada', que é um reconhecimento adicional de confiança."
    },
    {
        chaves: [
            "filtro de acessibilidade", "recurso de acessibilidade", "libras na vaga",
            "vaga acessivel", "vaga com libras", "vaga com tecnologia assistiva",
            "tecnologia assistiva"
        ],
        resposta:
            "Na página de Vagas você pode filtrar por público-alvo (PCD, 50+ ou ambos) e por recursos específicos, como intérprete de Libras, tecnologia assistiva, ambiente físico acessível e jornada adaptável."
    },
    {
        chaves: ["vaga para pcd", "vagas para pcd", "vaga para pessoa com deficiencia", "vagas para idoso"],
        // "vaga"/"emprego" e "50" na mesma frase, em qualquer ordem — cobre
        // frases como "vaga pra pessoa com mais de 50" sem precisar
        // enumerar toda variação de como alguém menciona 50+.
        regex: /(vaga|emprego)\w*[\s\S]*\b50\b|\b50\b[\s\S]*(vaga|emprego)\w*/,
        resposta:
            "No filtro 'Público da vaga', em Vagas, escolha entre PCD, 50+ ou PCD e 50+ para ver só as vagas destinadas a esses públicos."
    },
    {
        chaves: ["vaga", "emprego", "trabalho", "candidat", "achar vaga", "procurar vaga"],
        resposta:
            "Acesse a página Vagas para buscar por palavra-chave e filtrar por modalidade, público-alvo (PCD, 50+ ou ambos) e recursos de acessibilidade. Toque em 'Candidatar-se' na vaga para enviar seu perfil à empresa."
    },
    {
        chaves: ["status", "andamento", "resultado da candidatura"],
        resposta:
            "Acompanhe suas candidaturas no seu painel. Cada mudança de status (em análise, aprovada, recusada) gera uma notificação, e você pode cancelar uma candidatura por lá."
    },
    {
        regex: /(cancelar|desfazer)\s+(a\s+|uma\s+|minha\s+|sua\s+)?candidatura/,
        resposta:
            "No seu painel de candidato, abra a candidatura desejada e escolha cancelar."
    },
    {
        chaves: [
            "onde vejo minhas candidaturas", "onde vejo minhas vagas favoritas", "onde vejo quem sigo",
            "minha atividade", "vagas favoritas", "quem eu sigo", "quem sigo",
            "minhas curtidas", "meus comentarios", "meus compartilhamentos"
        ],
        // "pessoas/empresas que (eu) sigo" — o "eu" é opcional na fala natural.
        regex: /(pessoas|empresas)\s+que\s+(eu\s+)?sigo/,
        resposta:
            "Em 'Minha atividade', no menu do seu perfil, você vê num só lugar suas candidaturas, vagas favoritas, pessoas e empresas que segue, e suas curtidas, comentários e compartilhamentos no feed. É uma página só sua — mais ninguém tem acesso a ela."
    },
    {
        // Radicais de verbo + "vaga" próximos — sem isso, "publico"/"edito"/
        // "excluo" (conjugados) não bateriam com "publicar"/"editar"/
        // "excluir", e um radical sozinho ("public") colidiria com
        // "publicação" do Feed.
        regex: /(public|edit|exclu|delet|remov|anunci|cadastr|recrut)\w*\s+(a\s+|uma\s+)?vaga/,
        resposta:
            "Empresas com cadastro aprovado publicam, editam e excluem vagas pelo Painel de indicadores > Minhas vagas, podendo definir modalidade, público-alvo (PCD, 50+ ou ambos) e os recursos de acessibilidade oferecidos."
    },
    {
        chaves: ["empresa"],
        resposta:
            "Empresas cadastradas podem publicar vagas, acompanhar candidatos e conversar pelo chat. O cadastro passa por aprovação da equipe do ACESSO."
    },

    // ---------- Feed / rede social ----------
    {
        chaves: [
            "curt", "coment", "compartilh", "nova publicacao", "criar publicacao",
            "fazer uma publicacao", "postar", "publicar uma foto", "publicar no feed",
            "publicar algo"
        ],
        resposta:
            "No Feed, use o campo no topo para publicar um texto com até 4 imagens ou vídeos. Em cada publicação você pode curtir, comentar e compartilhar."
    },
    {
        chaves: [
            "sem escrever texto", "sem texto", "so a imagem", "somente a imagem",
            "so uma imagem", "somente uma imagem", "publicar sem texto"
        ],
        resposta:
            "Sim — uma publicação pode ter só imagem ou vídeo, sem nenhum texto, ou só texto, sem anexo. O único requisito é ter pelo menos um dos dois."
    },
    {
        regex: /denunc\w*\s+(uma\s+|um\s+)?(mensagem|conversa)/,
        resposta:
            "Denúncias de mensagem são feitas dentro da própria conversa, no menu de opções da mensagem. A equipe do ACESSO analisa o contexto antes de tomar qualquer ação."
    },
    {
        regex: /denunc\w*\s+(um\s+|uma\s+)?(perfil|pessoa|usuario)/,
        resposta:
            "No perfil da pessoa, use o menu de opções (⋮) e escolha 'Denunciar'. A equipe do ACESSO analisa cada denúncia."
    },
    {
        chaves: ["denunc", "abuso", "reportar"],
        resposta:
            "Toque no menu de opções (⋮) de uma publicação, comentário, vaga, perfil ou mensagem e escolha 'Denunciar'. Nossa equipe analisa cada denúncia e você recebe uma notificação quando ela for concluída."
    },
    {
        chaves: ["bloque"],
        resposta:
            "No perfil da pessoa, use o menu de opções para bloqueá-la. Um usuário bloqueado não consegue ver seu perfil nem enviar mensagens. Veja sua lista de bloqueados em Configurações > Privacidade."
    },

    // ---------- Mensagens ----------
    {
        // "mensage" (sem o "m"/"ns" final) cobre "mensagem" e "mensagens" —
        // "mensagem" sozinho não bate com a forma plural.
        chaves: ["mensage", "chat", "conversa", "falar", "iniciar conversa"],
        resposta:
            "Use a área de Mensagens para conversar diretamente com empresas e candidatos — pelo perfil da pessoa/empresa ou pela página de uma vaga. As conversas ficam salvas e um contador mostra as mensagens não lidas."
    },

    // ---------- Privacidade ----------
    {
        chaves: [
            "privacidade", "quem ve meus dados", "dados pessoais", "visibilidade",
            "quem pode ver meu perfil", "alterar minha privacidade", "alterar privacidade"
        ],
        resposta:
            "Em Configurações > Privacidade você controla quem vê seu perfil e seus dados de contato. Informações sobre deficiência nunca são públicas por padrão — só ficam visíveis para você mesmo e, quando aplicável, para a equipe administrativa."
    },

    // ---------- Acessibilidade ----------
    {
        chaves: ["libras", "surdo", "surdez", "sinais"],
        resposta:
            "O ACESSO integra o VLibras. Clique no ícone de mãos no canto da tela para ativar a tradução em Libras de qualquer texto da plataforma."
    },
    {
        regex: /desativ\w*.*(voz|leitura|leitor)|desligar.*(voz|leitura|leitor)|parar.*(a leitura|o leitor)/,
        resposta:
            "Para desativar a leitura por voz, vá em Configurações > Acessibilidade e desligue 'Leitura por voz'. Você pode reativar quando quiser."
    },
    {
        chaves: ["voz", "leitura", "ler", "audio", "cego", "cega"],
        resposta:
            "Ative a leitura por voz em Configurações > Acessibilidade. Na primeira ativação pedimos seu consentimento; depois é possível ajustar a velocidade da fala."
    },
    {
        chaves: ["modo escuro", "tema escuro", "dark mode"],
        resposta:
            "O modo escuro fica em Configurações > Acessibilidade, com uma prévia em tempo real antes de salvar."
    },
    {
        chaves: ["cursor ampliado", "cursor grande", "aumentar o cursor"],
        resposta:
            "O cursor ampliado fica em Configurações > Acessibilidade, na mesma tela de contraste e fonte."
    },
    {
        chaves: [
            "contraste", "enxergar", "baixa visao", "fonte", "letra", "tamanho",
            "espacamento", "acessibilidade", "configuracoes de acessibilidade",
            "altero minhas configuracoes"
        ],
        resposta:
            "Em Configurações > Acessibilidade você ajusta alto contraste, modo escuro, tamanho da fonte (até 200%), espaçamento entre letras e linhas, fonte para dislexia, cursor ampliado e redução de animações — tudo com uma prévia em tempo real antes de salvar."
    }
];

const RESPOSTA_PADRAO =
    "Ainda não sei responder isso. Você pode perguntar sobre conta, perfil, vagas, candidaturas, mensagens, privacidade ou recursos de acessibilidade (Libras, leitura por voz, contraste e fonte). Se preferir, acesse a Central de Ajuda.";

const normalizar = (texto) =>
    String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");

class ChatbotService {
    /**
     * Escolhe o tópico com maior soma de CARACTERES das chaves batidas
     * (não a contagem de chaves) — uma pergunta que bate uma chave longa
     * e específica ("empresa verificada") deve vencer uma que bate só
     * uma chave curta e genérica ("empresa"), mesmo com uma única chave
     * cada. `regex` soma pontuação fixa, no mesmo patamar de uma chave
     * de frase específica. Critério simples, determinístico, sem custo
     * externo e sem IA.
     */
    responder(pergunta) {
        const texto = normalizar(pergunta);

        const melhor = BASE_CONHECIMENTO.map((item) => {
            const chavesBatidas = (item.chaves || []).filter((chave) => texto.includes(chave));
            let pontos = chavesBatidas.reduce((soma, chave) => soma + chave.length, 0);

            if (item.regex && item.regex.test(texto)) {
                pontos += 20;
            }

            return { pontos, resposta: item.resposta };
        })
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
