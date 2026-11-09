import env from "../config/env.js";
import ErroApi from "../utils/ErroApi.js";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Teto de tokens da resposta. Na API de chat da OpenRouter esse orçamento é compartilhado entre o
 * raciocínio interno do modelo e o texto visível: se o modelo gasta tudo pensando, a resposta volta
 * com `finish_reason: "length"` e `content` vazio. Era o que acontecia com 150 tokens e um modelo
 * de raciocínio. Aqui o raciocínio é desligado (`reasoning.enabled: false`) e o teto é folgado —
 * uma descrição de duas frases nunca chega perto disso.
 */
const MAX_TOKENS_RESPOSTA = 400;

/** Abaixo disso não vale a pena tentar outro modelo: a chamada não terminaria dentro do orçamento. */
const TEMPO_MINIMO_PARA_TENTAR_MS = 2500;

/**
 * Mensagem para o usuário conforme o que aconteceu com TODOS os modelos. Ordem de prioridade: o
 * problema mais acionável primeiro (chave/crédito), depois limite, depois tempo.
 */
function mensagemDaFalha(tentativas) {
    const motivos = new Set(tentativas.map((t) => t.motivo));

    if (motivos.has("chave_recusada")) {
        return "A chave do serviço de sugestão de descrição foi recusada. Escreva a descrição manualmente por enquanto.";
    }

    if (motivos.has("sem_credito")) {
        return "A cota do serviço gratuito de sugestão de descrição acabou. Escreva a descrição manualmente por enquanto.";
    }

    if (motivos.size === 1 && motivos.has("limite_do_provedor")) {
        return "Limite de uso do serviço de sugestão foi atingido. Tente novamente mais tarde.";
    }

    if (motivos.size === 1 && motivos.has("tempo_esgotado")) {
        return "Não foi possível gerar uma sugestão de descrição a tempo. Tente novamente.";
    }

    if (motivos.size === 1 && motivos.has("sem_conexao")) {
        return "Não foi possível conectar ao serviço de sugestão de descrição.";
    }

    return "O serviço de sugestão não conseguiu gerar uma descrição para esta imagem agora. Tente novamente ou escreva a descrição manualmente.";
}

/**
 * Cliente fino para a API de chat da OpenRouter (openrouter.ai), um agregador que dá acesso a
 * modelos de vários provedores por uma única API.
 *
 * **Um pedido por modelo, em ordem de prioridade** (`env.openRouter.models`), e não o parâmetro
 * `models` da própria OpenRouter. A diferença importa: o `models` dela só troca de modelo quando o
 * provedor devolve erro, e as duas falhas mais comuns aqui não são erro — o modelo responde 200 com
 * `content` vazio (gastou o orçamento de tokens raciocinando) ou responde com algo que não é uma
 * descrição ("User Safety: safe", de um classificador de moderação). Tentando um por um, quem
 * chama pode rejeitar a resposta (`aceitar`) e o próximo modelo é tentado de verdade. Também
 * sobrevive a um id de modelo que deixou de existir, em vez de o pedido inteiro falhar.
 *
 * O roteador "openrouter/free" continua fora: ele pode cair num modelo sem relação com descrever
 * imagem.
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
     * Um pedido a um modelo. Nunca lança: devolve `{ texto }` quando deu certo ou
     * `{ motivo, detalhe, fatal }` quando não. Tentar o próximo modelo é decisão de quem chama.
     */
    async pedirAoModelo({ modelo, imagemUrl, prompt, limiteMs }) {
        const controlador = new AbortController();
        const idTimeout = setTimeout(() => controlador.abort(), limiteMs);

        let resposta;
        try {
            resposta = await fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${env.openRouter.apiKey}`,
                    "Content-Type": "application/json",
                    // Atribuição pedida pela OpenRouter: identifica a aplicação, não quem usa.
                    // Nenhum dado de usuário vai nesses cabeçalhos.
                    "HTTP-Referer": env.frontendUrl,
                    "X-Title": "ACESSO"
                },
                body: JSON.stringify({
                    model: modelo,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: imagemUrl } }
                            ]
                        }
                    ],
                    max_tokens: MAX_TOKENS_RESPOSTA,
                    temperature: 0.2,
                    // Ver MAX_TOKENS_RESPOSTA: com raciocínio ligado, o modelo pode gastar o
                    // orçamento todo pensando e devolver texto vazio. Nenhum dos modelos
                    // gratuitos com visão exige raciocínio (`reasoning.mandatory: false` em
                    // GET /api/v1/models), então desligar é seguro para todos.
                    reasoning: { enabled: false }
                }),
                signal: controlador.signal
            });
        } catch (erro) {
            return erro?.name === "AbortError"
                ? { motivo: "tempo_esgotado" }
                : { motivo: "sem_conexao", detalhe: erro?.message };
        } finally {
            clearTimeout(idTimeout);
        }

        if (resposta.status === 401 || resposta.status === 403) {
            return { motivo: "chave_recusada", fatal: true };
        }

        if (resposta.status === 402) {
            return { motivo: "sem_credito", fatal: true };
        }

        if (resposta.status === 429) {
            return { motivo: "limite_do_provedor" };
        }

        const dados = await resposta.json().catch(() => null);

        if (!resposta.ok) {
            return {
                motivo: resposta.status >= 500 ? "provedor_indisponivel" : "pedido_recusado",
                detalhe: `${resposta.status} ${String(dados?.error?.message ?? "").slice(0, 120)}`
            };
        }

        // A OpenRouter também devolve erro dentro de um 200.
        if (dados?.error) {
            return { motivo: "pedido_recusado", detalhe: String(dados.error.message ?? "").slice(0, 120) };
        }

        const escolha = dados?.choices?.[0];
        const texto = extrairTexto(escolha?.message?.content);

        if (!texto) {
            const gastoEmRaciocinio =
                Number(dados?.usage?.completion_tokens_details?.reasoning_tokens) || 0;

            return {
                motivo:
                    escolha?.finish_reason === "length" || gastoEmRaciocinio > 0
                        ? "orcamento_gasto_no_raciocinio"
                        : "resposta_vazia",
                detalhe: `finish_reason=${escolha?.finish_reason ?? "?"} raciocinio=${gastoEmRaciocinio}`
            };
        }

        return { texto };
    }

    /**
     * Pede a descrição ao primeiro modelo que devolver um texto aceito por `aceitar`.
     *
     * @param {Buffer} imagemBuffer
     * @param {string} mimetype
     * @param {string} prompt - instrução textual (o "o que fazer com a imagem")
     * @param {{ aceitar?: (texto: string) => boolean }} [opcoes]
     *   `aceitar` decide se a resposta serve; recusar faz tentar o próximo modelo.
     * @returns {Promise<{ texto: string, modelo: string }>}
     */
    async gerarTextoSobreImagem(imagemBuffer, mimetype, prompt, { aceitar = () => true } = {}) {
        if (!this.disponivel()) {
            throw ErroApi.servicoIndisponivel(
                "Sugestão de descrição por IA não está configurada neste momento."
            );
        }

        // Sem isto, um `req.file` sem `buffer` (upload gravado em disco) viraria um
        // TypeError e um 500 sem explicação.
        if (!Buffer.isBuffer(imagemBuffer) || imagemBuffer.length === 0) {
            throw ErroApi.requisicaoInvalida("Envie uma imagem para gerar a sugestão.");
        }

        const imagemUrl = `data:${mimetype};base64,${imagemBuffer.toString("base64")}`;
        const prazoFinal = Date.now() + env.openRouter.orcamentoMs;
        const tentativas = [];

        for (const modelo of env.openRouter.models) {
            const restante = prazoFinal - Date.now();

            if (restante < TEMPO_MINIMO_PARA_TENTAR_MS) {
                tentativas.push({ modelo, motivo: "sem_tempo_no_orcamento" });
                break;
            }

            const resultado = await this.pedirAoModelo({
                modelo,
                imagemUrl,
                prompt,
                limiteMs: Math.min(env.openRouter.timeoutMs, restante)
            });

            if (resultado.texto && aceitar(resultado.texto)) {
                if (tentativas.length > 0) {
                    // Só registra quando houve troca de modelo: é o sinal de que a lista de
                    // prioridade precisa de revisão.
                    console.error(
                        JSON.stringify({
                            nivel: "warn",
                            servico: "OpenRouterService",
                            motivo: "modelo_de_reserva_respondeu",
                            modelo,
                            tentativas
                        })
                    );
                }

                return { texto: resultado.texto, modelo };
            }

            tentativas.push({
                modelo,
                motivo: resultado.texto ? "resposta_rejeitada" : resultado.motivo,
                detalhe: resultado.detalhe
            });

            if (resultado.fatal) {
                break;
            }
        }

        console.error(
            JSON.stringify({
                nivel: "error",
                servico: "OpenRouterService",
                motivo: "nenhum_modelo_respondeu",
                tentativas
            })
        );

        throw ErroApi.servicoIndisponivel(mensagemDaFalha(tentativas));
    }
}

/**
 * `content` pode vir como texto puro ou como lista de partes (`[{ type: "text", text }]`),
 * dependendo do modelo. As duas formas valem.
 */
function extrairTexto(conteudo) {
    if (typeof conteudo === "string") {
        return conteudo.trim();
    }

    if (Array.isArray(conteudo)) {
        return conteudo
            .filter((parte) => parte?.type === "text" && typeof parte.text === "string")
            .map((parte) => parte.text)
            .join(" ")
            .trim();
    }

    return "";
}

export default new OpenRouterService();
