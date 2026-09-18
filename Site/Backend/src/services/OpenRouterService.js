import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Cliente fino para a API de chat da OpenRouter (openrouter.ai), um agregador que dá acesso a
 * modelos de vários provedores por uma única API.
 *
 * Usa uma lista de modelos gratuitos com visão (`env.openRouter.models`, configurável por
 * `OPENROUTER_MODEL`) no parâmetro `models`, e a OpenRouter tenta cada um em ordem. O roteador
 * "openrouter/free" não é usado porque pode escolher um modelo sem relação com descrever imagem (já
 * devolveu "User Safety: safe", de um classificador de moderação).
 *
 * Nunca repassa o erro cru do provedor: quem chama recebe sempre um `ErroApi` com mensagem
 * genérica.
 */
class OpenRouterService {
    /** Sem chave configurada, a funcionalidade fica indisponível, mas nunca derruba a aplicação. */
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
            throw ErroApi.servicoIndisponivel(
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
                    // `models`, e não `model`: tenta cada modelo da lista em ordem até um responder
                    // (ver o comentário em `env.js` sobre o roteador "openrouter/free").
                    models: env.openRouter.models,
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
                throw ErroApi.servicoIndisponivel(
                    "Não foi possível gerar uma sugestão de descrição a tempo."
                );
            }

            throw ErroApi.servicoIndisponivel(
                "Não foi possível conectar ao serviço de sugestão de descrição."
            );
        } finally {
            clearTimeout(idTimeout);
        }

        if (resposta.status === 429) {
            throw ErroApi.servicoIndisponivel(
                "Limite de uso do serviço de sugestão foi atingido. Tente novamente mais tarde."
            );
        }

        if (!resposta.ok) {
            throw ErroApi.servicoIndisponivel(
                "O serviço de sugestão de descrição não conseguiu processar esta imagem."
            );
        }

        const dados = await resposta.json().catch(() => null);
        const texto = dados?.choices?.[0]?.message?.content;

        if (!texto || typeof texto !== "string" || !texto.trim()) {
            throw ErroApi.servicoIndisponivel(
                "O serviço de sugestão não retornou uma descrição válida."
            );
        }

        return texto.trim();
    }
}

export default new OpenRouterService();
