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
            "1. Na tela inicial, toque em 'Criar conta'. 2. Escolha se você é 'Pessoa candidata' ou 'Empresa'. 3. Preencha os dados pedidos (nome, e-mail, senha e, para empresa, CNPJ e razão social). 4. Toque em 'Continuar para acessibilidade'. 5. Configure suas preferências de acessibilidade. Pronto — se a confirmação por e-mail estiver ativa, você recebe um link antes de poder entrar; caso contrário, o acesso já é liberado."
    },
    {
        chaves: ["login", "fazer login", "entrar na minha conta", "acessar minha conta"],
        resposta:
            "1. Na tela 'Entrar no ACESSO', informe seu e-mail. 2. Informe sua senha. 3. Toque em 'Entrar'. 4. Se você tiver a verificação em duas etapas ativada, informe o código do seu aplicativo autenticador. Esqueceu a senha? Toque em 'Esqueceu a senha?', ao lado do campo de senha."
    },
    {
        chaves: ["esqueci", "recuperar senha", "esqueci minha senha", "recuperar minha senha"],
        resposta:
            "1. Na tela Entrar, toque em 'Esqueceu a senha?'. 2. Informe o e-mail da sua conta. 3. Verifique sua caixa de entrada — você recebe um código de 6 dígitos, válido por 15 minutos. 4. Na tela de redefinição, informe o código e a nova senha. 5. Faça login com a nova senha."
    },
    {
        chaves: ["alterar minha senha", "trocar minha senha", "mudar minha senha", "alterar senha", "altero minha senha", "altero a senha"],
        resposta:
            "1. Acesse Configurações (menu do seu perfil). 2. Na seção Conta, toque em 'Alterar senha'. 3. Informe sua 'Senha atual'. 4. Informe a 'Nova senha'. 5. Repita em 'Confirmar nova senha'. 6. Toque em Salvar."
    },
    {
        regex: /\blogout\b|sa(ir|io)\s+da\s+(minha\s+)?conta|fazer logout|encerrar (a )?sessao/,
        resposta:
            "1. Toque na sua foto/nome, no canto superior da tela. 2. No menu que abrir, escolha 'Sair'."
    },
    {
        chaves: [
            "excluir conta", "excluir minha conta", "deletar conta", "deletar minha conta",
            "cancelar conta", "cancelar minha conta", "encerrar conta", "encerrar minha conta",
            "pausar conta", "pausar minha conta", "excluo minha conta", "excluo a conta",
            "deleto minha conta", "encerro minha conta", "pauso minha conta"
        ],
        resposta:
            "1. Acesse Configurações > Conta. 2. Escolha 'Pausar conta' (reversível — basta entrar de novo pra reativar) ou 'Excluir conta' (permanente). 3. Informe sua senha atual para confirmar. Atenção: excluir a conta não pode ser desfeito."
    },
    {
        chaves: ["2fa", "dois fatores", "duas etapas"],
        resposta:
            "1. Acesse Configurações > Segurança. 2. Toque em 'Ativar autenticação de dois fatores'. 3. Informe sua senha atual. 4. Escaneie o QR code com um app autenticador (Google Authenticator, Authy ou similar) — ou copie o código e cole manualmente no app. 5. Digite o código de 6 dígitos gerado pelo app para confirmar. A partir daí, o login pede esse código toda vez."
    },

    // ---------- Perfil ----------
    {
        chaves: [
            "curriculo", "experiencia", "formacao", "habilidade", "certificad",
            "alterar meu perfil", "editar meu perfil", "editar perfil",
            "ver meu perfil", "visualizar meu perfil", "editar minhas informacoes",
            "alterar minhas informacoes", "mudar meu titulo", "alterar meu titulo",
            "alterar meus dados", "mudar meus dados", "altero meus dados",
            "titulo profissional", "adicionar titulo", "adicionar experiencia",
            "adicionar formacao", "adicionar certificado", "adicionar habilidade"
        ],
        resposta:
            "Para editar seu título profissional, biografia e dados pessoais: 1. Acesse seu perfil. 2. Toque em 'Editar perfil' (ou em 'Adicionar título profissional', se ainda não tiver um). 3. Preencha o campo 'Título profissional' (ex.: Auxiliar Administrativo). 4. Ajuste também biografia, cidade, escolaridade e outros campos, se quiser. 5. Toque em Salvar.\n\nPara adicionar experiência, formação, certificado ou habilidade: 1. No seu perfil, role até a seção correspondente (Experiência profissional, Formação acadêmica, Certificados ou Habilidades). 2. Toque em 'Adicionar'. 3. Preencha os campos (cargo, empresa, período, etc. — cada seção tem os seus). 4. Toque em Salvar. Você pode editar ou remover qualquer item depois, pelos ícones ao lado dele.\n\nPara enviar o currículo: em 'Editar perfil', envie o arquivo em PDF ou DOCX — ele fica em armazenamento privado, acessível só por você, pela equipe do ACESSO e por empresas com uma candidatura sua."
    },
    {
        chaves: ["ver perfil de outra pessoa", "visualizar outro perfil", "ver o perfil de"],
        resposta:
            "Toque no nome ou na foto da pessoa em qualquer publicação, vaga, sugestão do Descobrir ou resultado de busca — isso abre o perfil dela."
    },
    {
        // "sigo" é a conjugação em primeira pessoa de "seguir" — sem o
        // regex, "como sigo uma empresa" não bate com "seguir uma empresa".
        chaves: ["seguir alguem", "seguir uma pessoa", "seguir um perfil", "seguir uma empresa"],
        regex: /\bsigo\s+(uma\s+|um\s+)?(pessoa|empresa|perfil)/,
        resposta:
            "1. Abra o perfil da pessoa ou empresa. 2. Toque no botão 'Seguir'. Não é preciso aceite — diferente de um pedido de conexão, seguir é imediato."
    },
    {
        chaves: ["deixar de seguir", "parar de seguir", "deixo de seguir"],
        resposta:
            "1. Abra o perfil de quem você segue. 2. Toque no botão (que agora mostra 'Seguindo'). Isso já deixa de seguir a pessoa ou empresa."
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
            "1. Acesse a página Vagas. 2. Abra os filtros. 3. Em 'Público da vaga', escolha PCD, 50+ ou PCD e 50+. 4. Em recursos de acessibilidade, marque os que você precisa (intérprete de Libras, tecnologia assistiva, ambiente físico acessível, jornada adaptável). Os selos escolhidos aparecem no card de cada vaga compatível."
    },
    {
        chaves: ["vaga para pcd", "vagas para pcd", "vaga para pessoa com deficiencia", "vagas para idoso"],
        // "vaga"/"emprego" e "50" na mesma frase, em qualquer ordem — cobre
        // frases como "vaga pra pessoa com mais de 50" sem precisar
        // enumerar toda variação de como alguém menciona 50+.
        regex: /(vaga|emprego)\w*[\s\S]*\b50\b|\b50\b[\s\S]*(vaga|emprego)\w*/,
        resposta:
            "1. Acesse a página Vagas. 2. Abra os filtros. 3. Em 'Público da vaga', escolha PCD, 50+ ou PCD e 50+. Só as vagas destinadas a esse público aparecem na lista."
    },
    {
        chaves: ["vaga", "emprego", "trabalho", "candidat", "achar vaga", "procurar vaga"],
        resposta:
            "1. Acesse a página Vagas. 2. Busque por palavra-chave e/ou use os filtros (modalidade, público-alvo, recursos de acessibilidade). 3. Toque na vaga para ver os detalhes completos. 4. Toque em 'Candidatar-se' para enviar seu perfil à empresa. Sua candidatura usa os dados já cadastrados no seu perfil."
    },
    {
        chaves: ["status", "andamento", "resultado da candidatura", "minhas candidaturas", "ver minhas candidaturas"],
        resposta:
            "1. Acesse seu painel de candidato. 2. Veja a lista de candidaturas com o status atual de cada uma (pendente, em análise, aprovada ou rejeitada). Você recebe uma notificação a cada mudança de status."
    },
    {
        regex: /(cancel|desfaz)\w*\s+(a\s+|uma\s+|minha\s+|sua\s+)?candidatura/,
        resposta:
            "1. Acesse seu painel de candidato. 2. Abra a candidatura desejada. 3. Escolha a opção de cancelar."
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
            "Para criar: 1. No painel da empresa, toque em 'Nova vaga'. 2. Preencha cargo, descrição, localização, modalidade, público-alvo e recursos de acessibilidade oferecidos. 3. Publique.\n\nPara editar: 1. No painel, abra a vaga em 'Minhas vagas'. 2. Toque em 'Editar'. 3. Atualize o que precisar e salve.\n\nPara pausar, reabrir ou encerrar: use as ações na própria vaga, dentro de 'Minhas vagas' — elas ficam organizadas em Aberta, Pausada e Encerrada. Tudo isso exige que a empresa já esteja aprovada pela equipe do ACESSO."
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
            "1. Acesse o Feed. 2. Escreva no campo 'Compartilhe algo...' no topo. 3. Se quiser, toque em Foto ou Vídeo para anexar (até 4 arquivos). 4. Toque em 'Publicar'. Em qualquer publicação você também pode curtir, comentar e compartilhar."
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
            "1. Abra a conversa com a mensagem em questão. 2. Toque no menu de opções (⋮) da mensagem. 3. Escolha 'Denunciar'. A equipe do ACESSO analisa o contexto antes de tomar qualquer ação."
    },
    {
        regex: /denunc\w*\s+(um\s+|uma\s+)?(perfil|pessoa|usuario)/,
        resposta:
            "1. Abra o perfil da pessoa. 2. Toque no menu de opções (⋮). 3. Escolha 'Denunciar'. A equipe do ACESSO analisa cada denúncia."
    },
    {
        chaves: ["denunc", "abuso", "reportar"],
        resposta:
            "1. No conteúdo que você quer denunciar (publicação, comentário, vaga, perfil ou mensagem), toque no menu de opções (⋮). 2. Escolha 'Denunciar'. 3. Descreva o motivo, se pedido. Nossa equipe analisa cada denúncia e você recebe uma notificação quando ela for concluída."
    },
    {
        chaves: ["bloque"],
        resposta:
            "1. Abra o perfil da pessoa. 2. Toque no menu de opções. 3. Escolha 'Bloquear'. Um usuário bloqueado não consegue ver seu perfil nem enviar mensagens. Veja e gerencie sua lista de bloqueados em Configurações > Privacidade > Usuários bloqueados."
    },

    // ---------- Mensagens ----------
    {
        // "mensage" (sem o "m"/"ns" final) cobre "mensagem" e "mensagens" —
        // "mensagem" sozinho não bate com a forma plural. O regex cobre
        // "envio/enviar/mandar (uma) mensagem" com uma palavra no meio
        // ("uma") — sem ele, essa frase colide em pontos com a chave
        // curta "empresa" do tópico de Vagas e pode perder no empate.
        chaves: ["mensage", "chat", "conversa", "falar", "iniciar conversa"],
        regex: /\b(envi|mand)\w*\s+(uma\s+)?mensage/,
        resposta:
            "1. Abra o perfil da pessoa/empresa (ou a página de uma vaga). 2. Toque em 'Enviar mensagem' ou 'Conversar com a empresa'. 3. Digite e envie. Todas as conversas ficam disponíveis na área de Mensagens, com um contador de não lidas."
    },

    // ---------- Notificações ----------
    {
        chaves: [
            "notificacao", "notificacoes", "receber notificacao", "desativar notificacao",
            "silenciar notificacao"
        ],
        resposta:
            "1. Acesse Configurações > Notificações. 2. Ligue ou desligue cada categoria separadamente: 'Vagas e candidaturas', 'Mensagens', 'Publicações e comentários' e rede/seguidores."
    },

    // ---------- Privacidade ----------
    {
        chaves: [
            "privacidade", "quem ve meus dados", "dados pessoais", "visibilidade",
            "quem pode ver meu perfil", "alterar minha privacidade", "alterar privacidade"
        ],
        resposta:
            "1. Acesse Configurações > Privacidade > Perfil público. 2. Ajuste quem vê seu perfil e seus dados de contato. Informações sobre deficiência nunca são públicas por padrão — só ficam visíveis para você mesmo e, quando aplicável, para uma empresa com candidatura sua ou para a equipe administrativa."
    },

    // ---------- Acessibilidade ----------
    {
        chaves: ["libras", "surdo", "surdez", "sinais"],
        resposta:
            "1. Toque no ícone de mãos (VLibras), fixo no canto da tela em qualquer página. 2. Selecione o texto que você quer traduzido. Você também pode ativar/desativar esse ícone em Configurações > Acessibilidade."
    },
    {
        regex: /desativ\w*.*(voz|leitura|leitor)|desligar.*(voz|leitura|leitor)|parar.*(a leitura|o leitor)/,
        resposta:
            "1. Acesse Configurações > Acessibilidade. 2. Desligue a opção 'Leitura por voz'. Você pode reativar quando quiser, do mesmo jeito."
    },
    {
        chaves: ["voz", "leitura", "ler", "audio", "cego", "cega"],
        resposta:
            "1. Acesse Configurações > Acessibilidade. 2. Ative 'Leitura por voz' (na primeira vez, pedimos seu consentimento). 3. Ajuste a velocidade da fala, se quiser, na mesma tela."
    },
    {
        chaves: ["modo escuro", "tema escuro", "dark mode"],
        resposta:
            "1. Acesse Configurações > Acessibilidade. 2. Ative o modo escuro. Você vê uma prévia em tempo real antes de salvar."
    },
    {
        chaves: ["cursor ampliado", "cursor grande", "aumentar o cursor"],
        resposta:
            "1. Acesse Configurações > Acessibilidade. 2. Ative 'Cursor ampliado', na mesma tela de contraste e fonte."
    },
    {
        chaves: [
            "contraste", "enxergar", "baixa visao", "fonte", "letra", "tamanho",
            "espacamento", "acessibilidade", "configuracoes de acessibilidade",
            "altero minhas configuracoes"
        ],
        resposta:
            "1. Acesse Configurações > Acessibilidade. 2. Ajuste alto contraste, modo escuro, tamanho da fonte (até 200%), espaçamento entre letras e linhas, fonte para dislexia, cursor ampliado e redução de animações. 3. Veja a prévia em tempo real. 4. Salve."
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
