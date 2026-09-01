import OpenRouterService from "./OpenRouterService.js";
import ApiError from "../utils/ApiError.js";

/**
 * Instrução enviada ao modelo de visão — as regras existem para impedir
 * exatamente o que uma descrição de acessibilidade nunca deve fazer:
 * inventar informação que a imagem não confirma, identificar pessoas, ou
 * inferir deficiência/diagnóstico/característica sensível a partir da
 * aparência de alguém.
 */
const PROMPT_DESCRICAO_IMAGEM = `Descreva o conteúdo desta imagem de forma objetiva e breve, para ser usada como texto alternativo de acessibilidade (leitores de tela).

Regras obrigatórias:
- Baseie-se apenas no que é visualmente identificável na imagem.
- Nunca invente nomes, locais, profissões ou qualquer informação que não possa ser confirmada pela própria imagem.
- Nunca tente identificar quem é a pessoa.
- Nunca infira ou mencione deficiência, diagnóstico, condição de saúde ou qualquer característica sensível.
- Evite suposições desnecessárias — descreva o que está visível, não o que você imagina que está acontecendo.
- Responda em português do Brasil, em uma ou duas frases curtas, sem formatação (sem markdown, sem aspas, sem prefixos como "Descrição:").`;

// Mesmo limite do campo `descricao` do anexo (ver validarDescricaoAnexo em
// postagemValidator.js) — nunca confia cegamente no tamanho da resposta do modelo.
const MAX_CARACTERES_RESPOSTA = 500;

// Sinais de que a resposta NÃO é uma descrição de imagem — um modelo
// gratuito às vezes devolve o resíduo de outra coisa (classificação de
// moderação, recusa em inglês, mensagem de sistema) em vez do texto
// pedido. Confirmado em teste real: um modelo já devolveu literalmente
// "User Safety: safe". Nunca deixa esse tipo de texto virar a descrição
// de acessibilidade de alguém — prefere falhar com uma mensagem amigável
// a entregar uma "descrição" que não descreve nada.
const PADRAO_RESPOSTA_INVALIDA =
    /\b(safety|moderation|content polic|cannot (assist|help|provide|comply)|i'?m sorry|as an ai|i can'?t|i cannot|não posso (ajudar|assistir|processar)|policy violation|flagged|blocked)\b/i;

function pareceDescricaoValida(texto) {
    if (!texto || texto.length < 8) return false;
    if (!texto.includes(" ")) return false; // uma descrição real sempre tem mais de uma palavra
    if (PADRAO_RESPOSTA_INVALIDA.test(texto)) return false;
    return true;
}

class SugestaoDescricaoService {
    /** Sem chave da OpenRouter configurada, o recurso fica indisponível — nunca derruba a aplicação. */
    disponivel() {
        return OpenRouterService.disponivel();
    }

    async sugerir(imagemBuffer, mimetype) {
        const bruto = await OpenRouterService.gerarTextoSobreImagem(
            imagemBuffer,
            mimetype,
            PROMPT_DESCRICAO_IMAGEM
        );

        const texto = bruto
            .replace(/^["'“”]+|["'“”]+$/g, "")
            .trim()
            .slice(0, MAX_CARACTERES_RESPOSTA);

        if (!pareceDescricaoValida(texto)) {
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "SugestaoDescricaoService",
                    motivo: "resposta_nao_parece_descricao",
                    // O texto em si nunca é sensível (não é dado do usuário),
                    // só registra pra diagnóstico de qual modelo devolveu isso.
                    resposta: texto.slice(0, 200)
                })
            );
            throw ApiError.serviceUnavailable(
                "O serviço de sugestão não conseguiu gerar uma descrição válida para esta imagem. Tente novamente ou escreva a descrição manualmente."
            );
        }

        return texto;
    }
}

export default new SugestaoDescricaoService();
