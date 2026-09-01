import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/** Mascara um e-mail para log seguro: "ped***@gmail.com" (nunca o endereço completo). */
function mascarar(email) {
    const [usuario, dominio] = String(email || "").split("@");
    if (!dominio) return "***";
    const visivel = usuario.slice(0, Math.min(3, usuario.length));
    return `${visivel}***@${dominio}`;
}

/**
 * Cliente fino para a API de e-mail transacional da Brevo (brevo.com).
 *
 * Segue o mesmo princípio já usado em OpenRouterService: sem
 * `BREVO_API_KEY` configurada, o recurso fica indisponível (nunca derruba
 * a aplicação) e nunca lança o erro cru do provedor para quem chama —
 * sempre um `ApiError` com mensagem genérica, sem detalhe interno.
 */
class EmailService {
    disponivel() {
        return Boolean(env.brevo.apiKey && env.brevo.remetenteEmail);
    }

    /**
     * @param {object} params
     * @param {string} params.para
     * @param {string} [params.nomeDestinatario]
     * @param {string} params.assunto
     * @param {string} params.html
     * @param {string} [params.texto]
     * @param {string} [params.tag] - identifica o fluxo no painel de
     *   estatísticas da Brevo (ex.: "confirmacao-cadastro",
     *   "recuperacao-senha") — uma chave de API só, tags por finalidade.
     *   Nunca cria uma chave nova por fluxo: o limite diário de envio da
     *   Brevo é por conta, não por chave, e a permissão de uma chave já é
     *   "enviar e-mail transacional" de forma genérica — chaves separadas
     *   não isolam nada de verdade, só dão mais credencial pra vazar.
     */
    async enviar({ para, nomeDestinatario, assunto, html, texto, tag }) {
        if (!this.disponivel()) {
            throw ApiError.serviceUnavailable(
                "Envio de e-mail não está configurado neste momento."
            );
        }

        const controlador = new AbortController();
        const idTimeout = setTimeout(() => controlador.abort(), env.brevo.timeoutMs);

        let resposta;
        try {
            resposta = await fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    "api-key": env.brevo.apiKey,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify({
                    sender: { email: env.brevo.remetenteEmail, name: env.brevo.remetenteNome },
                    to: [{ email: para, name: nomeDestinatario || undefined }],
                    subject: assunto,
                    htmlContent: html,
                    textContent: texto,
                    tags: tag ? [tag] : undefined
                }),
                signal: controlador.signal
            });
        } catch (erro) {
            const motivo = erro.name === "AbortError" ? "timeout" : "rede";
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "EmailService",
                    destinatario: mascarar(para),
                    tag: tag || null,
                    status: "falha",
                    motivo
                })
            );
            throw ApiError.serviceUnavailable(
                "Não foi possível enviar o e-mail agora. Tente novamente em alguns instantes."
            );
        } finally {
            clearTimeout(idTimeout);
        }

        if (!resposta.ok) {
            // Nunca repassa o corpo bruto da resposta da Brevo (pode conter
            // detalhes internos do provedor) — só o status, só no log do
            // servidor, nunca na resposta ao cliente.
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "EmailService",
                    destinatario: mascarar(para),
                    tag: tag || null,
                    status: "falha",
                    httpStatus: resposta.status
                })
            );
            throw ApiError.serviceUnavailable(
                "Não foi possível enviar o e-mail agora. Tente novamente em alguns instantes."
            );
        }

        console.info(
            JSON.stringify({
                nivel: "info",
                servico: "EmailService",
                destinatario: mascarar(para),
                tag: tag || null,
                status: "sucesso"
            })
        );
    }
}

export default new EmailService();
