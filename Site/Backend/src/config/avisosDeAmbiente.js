/**
 * Avisos sobre a configuração do ambiente, mostrados na inicialização sem impedir o servidor de subir.
 *
 * São funções puras sobre o que `env.js` já leu, para poderem ser testadas sem mexer em variáveis de
 * ambiente. Nenhum aviso imprime o valor de uma variável: só o nome dela e o que está errado.
 */

export const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i;

/** O caminho que o Express expõe para o retorno do Google (`routes/autenticacaoRoutes.js`, sob `/api`). */
const CAMINHO_DO_RETORNO = "/auth/google/callback";

const VARIAVEIS_DO_GOOGLE = [
    ["GOOGLE_CLIENT_ID", "clientId"],
    ["GOOGLE_CLIENT_SECRET", "clientSecret"],
    ["GOOGLE_REDIRECT_URI", "redirectUri"]
];

function origemDe(url) {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function caminhoDe(url) {
    try {
        return new URL(url).pathname.replace(/\/+$/, "");
    } catch {
        return null;
    }
}

/**
 * A conferência que o servidor faz ao iniciar quando `GOOGLE_CONTA_SEM_SENHA` está ligada: a coluna
 * `usuarios.senha_hash` já aceita nulo (migration 0007)? Sem isso, cada conta criada pelo Google
 * falharia no banco, e a pessoa veria um erro genérico no meio do cadastro. Devolve o texto do aviso,
 * ou `null` quando está tudo certo (ou a chave está desligada, e nada precisa ser conferido).
 *
 * `consultar` é quem pergunta ao banco e devolve `"YES"` ou `"NO"` (`is_nullable` do catálogo do
 * Postgres), ou `null` se a coluna não existir. Uma falha da própria consulta não derruba nada: vira
 * um aviso de que não deu para conferir.
 */
export async function avisoDaMigracaoContaSemSenha({ habilitado, consultar }) {
    if (!habilitado) return null;

    let aceitaNulo;
    try {
        aceitaNulo = await consultar();
    } catch {
        return "[ENV] GOOGLE_CONTA_SEM_SENHA está ligada, mas não consegui conferir se a migration 0007 foi aplicada.";
    }

    if (aceitaNulo === "YES") return null;

    return (
        "[ENV] GOOGLE_CONTA_SEM_SENHA está ligada, mas a migration 0007 (usuarios.senha_hash aceitando nulo) NÃO foi " +
        "aplicada: criar a conta pelo Google vai falhar no banco. Rode `npm run migrate` ou desligue a variável."
    );
}

/**
 * Avisos do login com Google (achado 9 e itens da seção de ambiente da auditoria).
 *
 * - **Configuração pela metade.** O recurso exige as três variáveis; com uma ou duas, o botão
 *   "Continuar com Google" simplesmente não aparece, e ninguém é avisado de que algo ficou faltando.
 * - **Endereço de retorno** que não termina em `/auth/google/callback`: o Google devolveria a pessoa
 *   para uma rota que não existe.
 * - **Produção.** Endereço de retorno em `localhost` (o Google mandaria a pessoa para a máquina
 *   dela) e `FRONTEND_URL` com origens locais (o CORS as aceita: útil para desenvolver contra a API
 *   publicada, mas é um acesso a mais que a produção não precisa).
 */
export function avisosDoGoogle({ google, isProducao, corsOrigins = [] }) {
    const avisos = [];

    const faltando = VARIAVEIS_DO_GOOGLE.filter(([, chave]) => !google[chave]).map(([nome]) => nome);

    if (faltando.length > 0 && faltando.length < VARIAVEIS_DO_GOOGLE.length) {
        avisos.push(
            `[ENV] Login com Google incompleto: faltam ${faltando.join(", ")}. Sem as três variáveis ` +
                "o botão \"Continuar com Google\" não aparece no Site, e nada avisa que algo ficou faltando."
        );
    }

    if (google.redirectUri) {
        const caminho = caminhoDe(google.redirectUri);

        if (caminho === null) {
            avisos.push("[ENV] GOOGLE_REDIRECT_URI não é uma URL absoluta válida (ex.: https://seu-backend/api/auth/google/callback).");
        } else if (!caminho.endsWith(CAMINHO_DO_RETORNO)) {
            avisos.push(
                `[ENV] GOOGLE_REDIRECT_URI não termina em ${CAMINHO_DO_RETORNO}: o Google devolveria a pessoa ` +
                    "para uma rota que não existe."
            );
        }

        if (isProducao && ORIGEM_LOCAL.test(origemDe(google.redirectUri) ?? "")) {
            avisos.push(
                "[ENV] Produção com GOOGLE_REDIRECT_URI apontando para localhost: o Google devolveria a " +
                    "pessoa para a máquina dela, e não para a API."
            );
        }
    }

    if (isProducao) {
        const locais = corsOrigins.filter((origem) => ORIGEM_LOCAL.test(origem));

        if (locais.length > 0) {
            avisos.push(
                `[ENV] Produção com ${locais.length} origem(ns) local(is) (localhost) em FRONTEND_URL: o CORS ` +
                    "as aceita. Serve para desenvolver contra a API publicada; se não for preciso, remova."
            );
        }
    }

    return avisos;
}

const COLUNAS_DAS_SESSOES = ["sessoes.familia_id", "sessoes.iniciada_em", "sessoes.ultimo_uso_em"];

/**
 * Com `SESSOES_DISPOSITIVOS_HABILITADO` ligada, confere (sem alterar nada) se a migration 0009 foi aplicada. Sem ela,
 * o login e a renovação de sessão falhariam no banco. `consultar` devolve os itens encontrados (`sessoes.coluna`).
 */
export async function avisoDaMigracaoSessoes({ habilitado, consultar }) {
    if (!habilitado) return null;

    let achados;
    try {
        achados = await consultar();
    } catch {
        return "[ENV] SESSOES_DISPOSITIVOS_HABILITADO está ligada, mas não consegui conferir se a migration 0009 foi aplicada.";
    }

    const faltando = COLUNAS_DAS_SESSOES.filter((item) => !achados.includes(item));

    if (faltando.length === 0) return null;

    return (
        `[ENV] SESSOES_DISPOSITIVOS_HABILITADO está ligada, mas a migration 0009 NÃO foi aplicada (faltam: ${faltando.join(", ")}). ` +
        "O login e a renovação de sessão vão falhar. Rode `npm run migrate` ou desligue a variável."
    );
}

/**
 * Com `IDIOMA_NA_CONTA_HABILITADO` ligada, confere (sem alterar nada) se a migration 0011 foi aplicada. Sem ela, ler ou salvar as
 * preferências de acessibilidade falharia no banco. `consultar` devolve os itens encontrados (`tabela.coluna`).
 */
export async function avisoDaMigracaoIdioma({ habilitado, consultar }) {
    if (!habilitado) return null;

    let achados;
    try {
        achados = await consultar();
    } catch {
        return "[ENV] IDIOMA_NA_CONTA_HABILITADO está ligada, mas não consegui conferir se a migration 0011 foi aplicada.";
    }

    if (achados.includes("preferencias_acessibilidade.idioma")) return null;

    return (
        "[ENV] IDIOMA_NA_CONTA_HABILITADO está ligada, mas a migration 0011 NÃO foi aplicada (falta: preferencias_acessibilidade.idioma). " +
        "As preferências de acessibilidade vão falhar. Rode `npm run migrate` ou desligue a variável."
    );
}

const TABELAS_DO_BLOCO_3 = ["dispositivos_confiaveis", "desafios_de_dispositivo", "links_de_seguranca", "eventos_de_seguranca"];

/**
 * Com `DISPOSITIVOS_CONFIAVEIS_HABILITADO` ligada, confere (sem alterar nada) se a migration 0010 foi aplicada. Sem ela, o login de
 * quem entra de um dispositivo novo falharia no banco. `consultar` devolve os nomes das tabelas encontradas.
 */
export async function avisoDaMigracaoSeguranca({ habilitado, consultar }) {
    if (!habilitado) return null;

    let achadas;
    try {
        achadas = await consultar();
    } catch {
        return "[ENV] DISPOSITIVOS_CONFIAVEIS_HABILITADO está ligada, mas não consegui conferir se a migration 0010 foi aplicada.";
    }

    const faltando = TABELAS_DO_BLOCO_3.filter((tabela) => !achadas.includes(tabela));

    if (faltando.length === 0) return null;

    return (
        `[ENV] DISPOSITIVOS_CONFIAVEIS_HABILITADO está ligada, mas a migration 0010 NÃO foi aplicada (faltam: ${faltando.join(", ")}). ` +
        "O login de quem entra de um dispositivo novo vai falhar. Rode `npm run migrate` ou desligue a variável."
    );
}

/**
 * Ligada, mas sem e-mail capaz de enviar o código: o recurso fica **inativo** (ninguém é trancado para fora). O aviso existe para
 * ninguém achar que a verificação está funcionando quando não está.
 */
export function avisosDaSeguranca({ seguranca, emailDisponivel }) {
    if (!seguranca?.dispositivosHabilitado || emailDisponivel) return [];

    return [
        "[ENV] DISPOSITIVOS_CONFIAVEIS_HABILITADO está ligada, mas o envio de e-mail não está configurado (BREVO_API_KEY e " +
            "BREVO_REMETENTE_EMAIL): a verificação de dispositivo novo está INATIVA e o login segue como antes."
    ];
}
