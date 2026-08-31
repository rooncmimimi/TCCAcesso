import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Cliente fino para a API de chat da OpenRouter (openrouter.ai) —
 * agregador que dá acesso a modelos de dezenas de provedores por trás de
 * uma única API, sem prender a aplicação a um provedor específico.
 *
 * Modelo padrão: `openrouter/free`, o roteador da própria OpenRouter que
 * escolhe, a cada chamada, um modelo de VISÃO gratuito disponível no
 * momento — gratuito permanente (não é crédito promocional que expira),
 * documentado em https://openrouter.ai/openrouter/free. Configurável via
 * `OPENROUTER_MODEL` caso se queira fixar um modelo específico no futuro.
 *
 * Nunca lança o erro cru do provedor para quem chama — sempre um
 * `ApiError` com uma mensagem genérica seguinte ao princípio "nunca expor
 * detalhe interno do backend" já seguido em todo o projeto.
 */
class OpenRouterService {
    /** Sem chave configurada, a funcionalidade fica indisponível — nunca derruba a aplicação. */
    disponivel() {
        return Boolean(env.openRouter.apiKey);
    }

    /**
     * @param {Buffer} imagemBuffer
     * @param {string} mimetype
     * @param {string} prompt - instrução textual (o "o que fazer com a imagem")
     * @returns {Promise<string>} texto da resposta do modelo, já sem espaços nas pontas
     */
    async gerarTextoSobreImagem(imagemBuffer, mimetype, prompt) {
        if (!this.disponivel()) {
            throw ApiError.serviceUnavailable(
                "Sugestão de descrição por IA não está configurada neste momento."
            );
        }

        const base64 = imagemBuffer.toString("base64");
        const controlador = new AbortController();
        const idTimeout = setTimeout(() => controlador.abort(), env.openRouter.timeoutMs);

        let resposta;
        try {
            resposta = await fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${env.openRouter.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: env.openRouter.model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: { url: `data:${mimetype};base64,${base64}` }
                                }
                            ]
                        }
                    ],
                    max_tokens: 150,
                    temperature: 0.2
                }),
                signal: controlador.signal
            });
        } catch (erro) {
            if (erro.name === "AbortError") {
                throw ApiError.serviceUnavailable(
                    "Não foi possível gerar uma sugestão de descrição a tempo."
                );
            }

            throw ApiError.serviceUnavailable(
                "Não foi possível conectar ao serviço de sugestão de descrição."
            );
        } finally {
            clearTimeout(idTimeout);
        }

        if (resposta.status === 429) {
            throw ApiError.serviceUnavailable(
                "Limite de uso do serviço de sugestão foi atingido. Tente novamente mais tarde."
            );
        }

        if (!resposta.ok) {
            throw ApiError.serviceUnavailable(
                "O serviço de sugestão de descrição não conseguiu processar esta imagem."
            );
        }

        const dados = await resposta.json().catch(() => null);
        const texto = dados?.choices?.[0]?.message?.content;

        if (!texto || typeof texto !== "string" || !texto.trim()) {
            throw ApiError.serviceUnavailable(
                "O serviço de sugestão não retornou uma descrição válida."
            );
        }

        return texto.trim();
    }
}

export default new OpenRouterService();
