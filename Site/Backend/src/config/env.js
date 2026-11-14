import dotenv from "dotenv";

import { ORIGEM_LOCAL, avisosDoGoogle } from "./avisosDeAmbiente.js";

dotenv.config();

/**
 * Centraliza e valida todas as variáveis de ambiente.
 *
 * Falhar cedo (fail-fast) evita que o servidor suba com uma
 * configuração incompleta e gere erros obscuros em runtime
 * (ex.: "secretOrPrivateKey must have a value" no JWT).
 */

const obrigatorias = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "JWT_SECRET"
];

const ausentes = obrigatorias.filter((chave) => {
    return !process.env[chave] || String(process.env[chave]).trim() === "";
});

if (ausentes.length > 0) {
    console.error(
        `[ENV] Variáveis de ambiente obrigatórias ausentes: ${ausentes.join(", ")}`
    );
    process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
    console.error(
        "[ENV] JWT_SECRET deve possuir no mínimo 32 caracteres. " +
            "Gere um valor forte com: openssl rand -hex 32"
    );
    process.exit(1);
}

const paraLista = (valor, padrao) => {
    if (!valor) {
        return padrao;
    }

    return valor
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

/** É uma URL absoluta (com protocolo) válida? Usado só para o aviso de boot abaixo. */
const ehUrlAbsolutaValida = (valor) => {
    try {
        new URL(valor);
        return true;
    } catch {
        return false;
    }
};

/**
 * `FRONTEND_URL` é uma lista, porque o CORS aceita mais de uma origem (localhost em desenvolvimento
 * junto da URL de produção). Os links de e-mail precisam de uma única URL: usar sempre a primeira
 * da lista mandaria links para localhost em produção se ela viesse antes. Por isso vale a primeira
 * origem que não é localhost; o CORS continua usando a lista inteira.
 */
const escolherOrigemPublica = (lista) => lista.find((url) => !ORIGEM_LOCAL.test(url)) ?? lista[0];

const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    isProducao: process.env.NODE_ENV === "production",
    port: Number(process.env.PORT) || 3000,

    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        // Supabase exige SSL. Em ambiente local pode ser desativado.
        ssl: process.env.DB_SSL !== "false"
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        // Access token de vida curta: a renovação transparente via refresh
        // token (SessaoService, validade própria de ~30 dias) é quem
        // sustenta a sessão longa do usuário; o access token só precisa
        // durar o suficiente entre duas renovações automáticas.
        expiresIn: process.env.JWT_EXPIRES_IN || "30m"
    },

    security: {
        bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
        corsOrigins: paraLista(process.env.FRONTEND_URL, [
            "http://localhost:5173"
        ]),
        uploadDir: process.env.UPLOAD_DIR || "uploads",
        maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024,
        // Vídeo precisa de um teto maior que imagem/documento, mas nunca
        // acima do limite real do bucket/projeto Supabase (confirme antes de
        // subir esse valor: Storage > bucket > "Restrict file size").
        maxVideoUploadBytes:
            Number(process.env.MAX_VIDEO_UPLOAD_BYTES) || 50 * 1024 * 1024
    },

    // Armazenamento dos arquivos enviados (fotos, capas, anexos de postagem, currículos). Com as
    // três variáveis abaixo, os arquivos vão para o Supabase Storage, que sobrevive a deploys e
    // reinícios. Sem elas, vão para o disco local: serve para desenvolvimento, mas nunca para
    // produção num host sem disco persistente.
    //
    // Dois buckets, com propósitos que não se misturam:
    // - publicBucket: fotos, capas e logos, resolvidos de forma síncrona via getPublicUrl (podem
    //   ser cacheados), além de anexos antigos de postagem com `privado = false`;
    // - privateBucket: currículos, certificados e anexos de postagem. Nunca viram URL pública: só
    //   URL assinada (createSignedUrl), gerada sob demanda por um endpoint autorizado e nunca
    //   gravada no banco.
    storage: {
        supabaseUrl: process.env.SUPABASE_URL || null,
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
        publicBucket: process.env.SUPABASE_STORAGE_PUBLIC_BUCKET || "public-media",
        privateBucket:
            process.env.SUPABASE_STORAGE_PRIVATE_BUCKET || "private-documents",
        // Validade da URL assinada de documentos privados (segundos).
        signedUrlExpiresSeconds:
            Number(process.env.SIGNED_URL_EXPIRES_SECONDS) || 300,
        // Validade da URL assinada da mídia de postagem cujo autor é público ou empresa no momento
        // da leitura, maior que `signedUrlExpiresSeconds`: não há ganho de segurança em expirar
        // rápido o que qualquer pessoa pode ver, e uma validade maior reduz quantas vezes a mesma
        // mídia é assinada durante a navegação. Mídia de autor privado continua com
        // `signedUrlExpiresSeconds`.
        signedUrlPublicExpiresSeconds:
            Number(process.env.SIGNED_URL_PUBLIC_EXPIRES_SECONDS) || 21600
    },

    // Sugestão de descrição de imagem por IA (OpenRouter): sempre opcional.
    // Sem `apiKey` configurada, o recurso fica indisponível e a aplicação
    // continua funcionando normalmente (descrição manual nunca depende
    // disto). Nunca falha o boot do servidor por causa dessa variável.
    openRouter: {
        apiKey: process.env.OPENROUTER_API_KEY || null,
        // Modelos GRATUITOS com visão, em ordem de prioridade. O serviço tenta UM POR VEZ e passa
        // ao próximo quando a resposta não serve (ver OpenRouterService) — por isso a ordem
        // importa de verdade aqui.
        //
        // Lista conferida em GET https://openrouter.ai/api/v1/models em 09/11/2026: todos têm
        // "image" entre as modalidades de entrada, todos são ":free" e nenhum exige raciocínio
        // ("reasoning.mandatory: false"). Os dois primeiros são os mais previsíveis para legenda
        // curta, porque já vêm com raciocínio desligado por padrão; os outros são de provedores
        // diferentes, e isso importa porque a cota gratuita da OpenRouter é contada por modelo.
        //
        // O roteador genérico "openrouter/free" NÃO é usado: ele pode cair num modelo sem relação
        // com descrever imagem (já devolveu a saída de um classificador de moderação).
        //
        // Configurável por `OPENROUTER_MODEL`, uma lista separada por vírgula, caso a oferta de
        // modelos gratuitos mude. Confira o id em /api/v1/models antes: um id que não existe mais
        // (era o caso de "minimax/minimax-m3:free") só gasta uma tentativa.
        models: paraLista(process.env.OPENROUTER_MODEL, [
            "google/gemma-4-31b-it:free",
            "nvidia/nemotron-3.5-super-vl:free",
            "google/gemma-4-26b-a4b-it:free",
            "dots-studio/dots-3-note-preview:free",
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
        ]),
        // Teto de UMA tentativa (um modelo). Modelo gratuito costuma responder em alguns segundos,
        // mas pode ficar na fila.
        timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS) || 15000,
        // Teto da requisição inteira, somando as tentativas: o serviço para de tentar modelos
        // quando o orçamento acaba, para quem está esperando na tela receber uma resposta (mesmo
        // que seja "não deu") em vez de o navegador desistir primeiro.
        orcamentoMs: Number(process.env.OPENROUTER_BUDGET_MS) || 40000
    },

    // E-mail transacional (confirmação de cadastro e recuperação de senha) pela Brevo. Sem
    // `apiKey`, o recurso fica indisponível: em desenvolvimento o código vai para o log do
    // servidor; em produção o servidor sobe, mas registra um aviso, porque ninguém receberia os
    // e-mails.
    // Entrar/cadastrar com Google (OAuth 2.0 / OpenID Connect). Sem as três variáveis o recurso
    // fica indisponível e o botão nem aparece no Site — nunca um botão que leva a erro.
    // O `redirectUri` precisa ser idêntico ao cadastrado no Google Cloud Console, caractere a
    // caractere, senão o próprio Google recusa a troca do código.
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || null,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || null,
        // Chave de segurança da etapa 6: com `true`, quem entra pelo Google e não tem conta ganha a
        // conta já no retorno, sem senha (o Site pede só o aceite dos termos e, depois, os dados).
        // Só ligue depois de aplicar a migration 0007 (`senha_hash` aceitando nulo): o servidor
        // confere ao iniciar e avisa se ela faltar. Desligada (o padrão), nada muda: o cadastro
        // segue o formulário de sempre, com senha, e contas já criadas sem senha continuam entrando.
        contaSemSenha: process.env.GOOGLE_CONTA_SEM_SENHA === "true"
    },

    brevo: {
        apiKey: process.env.BREVO_API_KEY || null,
        // Precisa ser um remetente verificado no painel do Brevo (endereço
        // ou domínio com SPF/DKIM configurados). Nunca invente um valor
        // aqui sem confirmar isso no painel do Brevo antes de ir a produção.
        remetenteEmail: process.env.BREVO_REMETENTE_EMAIL || null,
        remetenteNome: process.env.BREVO_REMETENTE_NOME || "ACESSO",
        timeoutMs: Number(process.env.BREVO_TIMEOUT_MS) || 15000
    },

    // Como os e-mails saem. `brevo` (padrão) usa a API; `console` só existe em desenvolvimento e teste e GRAVA os e-mails num
    // arquivo (`EMAIL_CONSOLE_ARQUIVO`) em vez de enviar. É recusado em produção.
    email: {
        driver: process.env.EMAIL_DRIVER === "console" ? "console" : "brevo",
        consoleArquivo: process.env.EMAIL_CONSOLE_ARQUIVO || null
    },

    contato: {
        // Para onde vão as mensagens do "Fale conosco". Sem valor padrão de propósito: nenhum endereço é inventado.
        // Sem isto (ou sem a Brevo acima), o formulário responde 503 dizendo que o envio não está disponível.
        destinoEmail: process.env.CONTATO_EMAIL_DESTINO || null
    },

    // Verificação por e-mail em dispositivo novo e recuperação de conta comprometida (Bloco 3).
    seguranca: {
        // Liga: depois da senha (ou do Google), um dispositivo que o Site ainda não confirmou recebe um código de 6 dígitos por
        // e-mail; e passam a existir o histórico de segurança, a lista de dispositivos de confiança e o "Acho que invadiram
        // minha conta". Desligada por padrão: a migration 0010 precisa estar aplicada e o e-mail (Brevo) configurado.
        dispositivosHabilitado: process.env.DISPOSITIVOS_CONFIAVEIS_HABILITADO === "true",
        // Por quantos dias um dispositivo marcado como de confiança dispensa o código do e-mail.
        diasDeConfianca: Math.min(365, Math.max(1, Number(process.env.DISPOSITIVOS_CONFIAVEIS_DIAS) || 90))
    },

    // Idioma do site guardado na conta (migration 0011). Desligado por padrão: sem a migration, a coluna não existe.
    idioma: {
        naContaHabilitado: process.env.IDIOMA_NA_CONTA_HABILITADO === "true"
    },

    // Personalização visual para daltonismo guardada na conta (migration 0014). Mesmo cuidado do
    // idioma: o Sequelize seleciona todas as colunas declaradas no model, então declarar a coluna
    // antes de rodar a migration derrubaria as preferências de acessibilidade inteiras.
    visual: {
        naContaHabilitado: process.env.VISUAL_NA_CONTA_HABILITADO === "true"
    },

    // Sessões e dispositivos (Bloco 2).
    sessoes: {
        // Liga: encerrar uma sessão corta o acesso na hora (o access token leva `sid`, e o servidor confere que a
        // sessão segue ativa), e a lista de dispositivos mostra início e última atividade verdadeiros. Desligada por
        // padrão porque a migration 0009 precisa estar aplicada antes (confira com `npm run implantacao:verificar`).
        dispositivosHabilitado: process.env.SESSOES_DISPOSITIVOS_HABILITADO === "true",
        // Teto de sessões ativas por conta: ao passar dele, as mais antigas são encerradas. Não depende da migration.
        maximoPorConta: Math.max(2, Number(process.env.SESSOES_MAXIMO_POR_CONTA) || 20)
    },

    // URL base do Frontend para montar links de e-mail (confirmação de
    // cadastro, redefinição de senha). Reaproveita FRONTEND_URL (mesma
    // variável já usada para CORS): usa a primeira origem da lista que
    // não for localhost (ver `escolherOrigemPublica` acima).
    frontendUrl: escolherOrigemPublica(
        paraLista(process.env.FRONTEND_URL, ["http://localhost:5173"])
    ),

    // Notificações push nativas pelo serviço da Expo, sempre opcionais. Sem `accessToken`, o
    // `NotificacaoPushService` ainda envia (a Expo aceita requisições sem token), mas o "Enhanced
    // Security" fica desligado; em produção, configure `EXPO_ACCESS_TOKEN` (expo.dev → Access
    // Tokens). Erro de envio de push nunca derruba a criação da notificação nem a ação do usuário.
    expoPush: {
        accessToken: process.env.EXPO_ACCESS_TOKEN || null
    }
};

/**
 * Em produção, sem Supabase Storage, os arquivos iriam para o disco local do Render, que é apagado
 * a cada deploy ou reinício. O servidor prefere não subir a perder arquivos de usuários em
 * silêncio.
 */
if (env.isProducao && !(env.storage.supabaseUrl && env.storage.supabaseServiceRoleKey)) {
    console.error(
        "[ENV] Produção sem Supabase Storage configurado (SUPABASE_URL / " +
            "SUPABASE_SERVICE_ROLE_KEY). O disco local do Render é efêmero " +
            "e arquivos enviados seriam perdidos a cada deploy/restart. " +
            "Configure o Supabase Storage antes de subir em produção."
    );
    process.exit(1);
}

/**
 * Aviso (não fail-fast): sem BREVO_API_KEY em produção, nenhum e-mail de
 * confirmação de cadastro ou recuperação de senha é enviado de verdade.
 * A aplicação continua no ar: AutenticacaoService detecta a ausência do provedor
 * e não exige confirmação de e-mail de contas novas nesse caso (evita
 * travar cadastros por uma dependência externa não configurada), mas o
 * comportamento correto (gate de verificação + recuperação de senha por
 * e-mail) só é ativado com a chave configurada.
 */
if (env.isProducao && env.email.driver === "console") {
    console.error(
        "[ENV] EMAIL_DRIVER=console não é permitido em produção: os e-mails seriam gravados em arquivo em vez de enviados. " +
            "Remova a variável (o padrão é a Brevo)."
    );
    process.exit(1);
}

if (env.isProducao && !env.brevo.apiKey) {
    console.error(
        "[ENV] Produção sem BREVO_API_KEY configurada. Recuperação de senha " +
            "e confirmação de e-mail de cadastro não enviarão e-mails reais " +
            "até essa variável ser configurada no Render."
    );
}

/**
 * Aviso, sem impedir a inicialização: uma `FRONTEND_URL` sem esquema ("meusite.onrender.com" em vez
 * de "https://meusite.onrender.com") não forma uma URL absoluta, e os links de e-mail sairiam
 * errados (`utils/urlFrontend.js` evita que isso derrube a requisição). O aviso mostra o problema
 * já no log de inicialização, sem imprimir o valor da variável.
 */
if (!ehUrlAbsolutaValida(env.frontendUrl)) {
    console.error(
        "[ENV] FRONTEND_URL configurada de forma inválida (precisa ser uma " +
            "URL absoluta com protocolo, ex.: https://seusite.com). Links " +
            "de e-mail (confirmação de cadastro, redefinição de senha) vão " +
            "sair sem o botão de acesso rápido até isso ser corrigido — o " +
            "código numérico continua funcionando normalmente."
    );
}

/**
 * Avisos do login com Google (variáveis faltando, endereço de retorno errado, origens locais em
 * produção). Nenhum imprime valor de variável. Ver `avisosDeAmbiente.js` e, para conferir de fato
 * com o Google, `npm run google:verificar`.
 */
for (const aviso of avisosDoGoogle({ google: env.google, isProducao: env.isProducao, corsOrigins: env.security.corsOrigins })) {
    console.error(aviso);
}

export default env;
