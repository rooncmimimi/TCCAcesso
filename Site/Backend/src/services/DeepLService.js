import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";

/**
 * Cliente fino da API de tradução da DeepL.
 *
 * **Qual endereço.** A DeepL tem dois, e usar o errado devolve 403 com uma chave perfeitamente
 * válida. Chave da camada gratuita termina em `:fx` e fala com `api-free.deepl.com`; chave paga
 * fala com `api.deepl.com`. O endereço é deduzido da própria chave, então trocar de plano é trocar
 * a variável de ambiente e mais nada.
 *
 * **Por que a DeepL.** A camada gratuita dá 500 mil caracteres por mês e tem **teto rígido**: ao
 * acabar, ela para de traduzir (456) em vez de cobrar. Num projeto sem orçamento isso vale mais do
 * que a cota maior de um concorrente que cobraria a diferença.
 *
 * Nunca repassa o erro cru da DeepL: quem chama recebe sempre um `ErroApi` com mensagem que dá para
 * mostrar a uma pessoa.
 */

/** Os três idiomas do Site. Como ORIGEM, a DeepL quer o código sem região. */
const ORIGEM_NA_DEEPL = { pt: "PT", en: "EN", es: "ES" };

/**
 * Como DESTINO é diferente: `EN` e `PT` sozinhos estão obsoletos na API, que pede a variante. Sem
 * isso a tradução até sai, mas com aviso de depreciação e sujeita a parar de funcionar.
 */
const DESTINO_NA_DEEPL = { pt: "PT-BR", en: "EN-US", es: "ES" };

export const IDIOMAS_ACEITOS = Object.keys(ORIGEM_NA_DEEPL);

class DeepLService {
    /** Sem chave configurada o recurso fica indisponível, e o Site cai para a reserva gratuita. */
    disponivel() {
        return Boolean(env.deepl.apiKey);
    }

    /**
     * O endereço certo para a chave configurada. Chave gratuita termina em `:fx`.
     *
     * `endpoint` no ambiente tem precedência, para apontar a um servidor de teste sem mexer no código.
     */
    baseUrl() {
        if (env.deepl.endpoint) return env.deepl.endpoint.replace(/\/+$/, "");

        return env.deepl.apiKey?.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
    }

    /** Transforma o status da DeepL em algo que a pessoa consiga ler, sem expor o provedor. */
    erroDoStatus(status) {
        if (status === 403) return ErroApi.servicoIndisponivel("A chave do serviço de tradução foi recusada.");
        if (status === 456) return new ErroApi(429, "A cota de tradução deste mês acabou.");
        if (status === 429 || status === 529) return new ErroApi(429, "O serviço de tradução está ocupado. Tente de novo em instantes.");
        if (status === 413 || status === 414) return ErroApi.requisicaoInvalida("Este texto é longo demais para traduzir de uma vez.");
        if (status === 400) return ErroApi.requisicaoInvalida("O serviço de tradução recusou o pedido.");

        return ErroApi.servicoIndisponivel("O serviço de tradução não respondeu agora.");
    }

    /**
     * Traduz vários textos numa requisição só.
     *
     * Um pedido para a lista inteira, e não um por texto: a DeepL aceita o lote (o limite é o
     * tamanho total, 128 KiB) e devolve na mesma ordem. Isso é o oposto do que o serviço gratuito
     * antigo obrigava — lá cada pedaço de 450 bytes era uma chamada.
     */
    async traduzir({ textos, origem, destino }) {
        if (!this.disponivel()) throw ErroApi.servicoIndisponivel("A tradução automática não está configurada no servidor.");

        const de = ORIGEM_NA_DEEPL[origem];
        const para = DESTINO_NA_DEEPL[destino];

        if (!de || !para) throw ErroApi.requisicaoInvalida("Idioma não aceito pela tradução.");

        const controlador = new AbortController();
        const relogio = setTimeout(() => controlador.abort(), env.deepl.timeoutMs);

        let resposta;

        try {
            resposta = await fetch(`${this.baseUrl()}/v2/translate`, {
                method: "POST",
                headers: {
                    Authorization: `DeepL-Auth-Key ${env.deepl.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text: textos, source_lang: de, target_lang: para }),
                signal: controlador.signal
            });
        } catch (erro) {
            // Tempo esgotado, DNS, rede: nada disso distingue nada para quem está esperando na tela.
            throw ErroApi.servicoIndisponivel(
                erro?.name === "AbortError" ? "O serviço de tradução demorou demais." : "Não foi possível falar com o serviço de tradução."
            );
        } finally {
            clearTimeout(relogio);
        }

        if (!resposta.ok) throw this.erroDoStatus(resposta.status);

        const corpo = await resposta.json().catch(() => null);
        const traducoes = Array.isArray(corpo?.translations) ? corpo.translations : null;

        // Vir menos item do que foi pedido quebraria o alinhamento com a lista de entrada, e aí o
        // texto traduzido de um apareceria no lugar do outro. Melhor falhar inteiro.
        if (!traducoes || traducoes.length !== textos.length) {
            throw ErroApi.servicoIndisponivel("A resposta do serviço de tradução veio incompleta.");
        }

        return traducoes.map((item) => (typeof item?.text === "string" ? item.text : ""));
    }

    /**
     * Quanto da cota do mês já foi gasto (`GET /v2/usage`).
     *
     * Não é usado em nenhuma rota: existe para o script de conferência e para quando alguém precisar
     * saber, sem ter que entrar no painel da DeepL.
     */
    async uso() {
        if (!this.disponivel()) throw ErroApi.servicoIndisponivel("A tradução automática não está configurada no servidor.");

        const resposta = await fetch(`${this.baseUrl()}/v2/usage`, {
            headers: { Authorization: `DeepL-Auth-Key ${env.deepl.apiKey}` }
        });

        if (!resposta.ok) throw this.erroDoStatus(resposta.status);

        const corpo = await resposta.json();

        return { usados: Number(corpo?.character_count) || 0, limite: Number(corpo?.character_limit) || 0 };
    }
}

export default new DeepLService();
