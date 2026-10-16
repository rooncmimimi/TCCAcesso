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
