import OpenRouterService from "./OpenRouterService.js";
import ErroApi from "../utils/ErroApi.js";

/**
 * Instrução enviada ao modelo de visão, no idioma em que a pessoa está usando o site — uma
 * descrição alternativa só serve se estiver no idioma de quem vai ouvi-la. As regras são as
 * mesmas nos três, e existem para impedir exatamente o que uma descrição de acessibilidade nunca
 * deve fazer: inventar informação que a imagem não confirma, identificar pessoas, ou inferir
 * deficiência/diagnóstico/característica sensível a partir da aparência de alguém.
 */
const PROMPTS = {
    pt: `Descreva o conteúdo desta imagem de forma objetiva e breve, para ser usada como texto alternativo de acessibilidade (leitores de tela).

Regras obrigatórias:
- Baseie-se apenas no que é visualmente identificável na imagem.
- Nunca invente nomes, locais, profissões ou qualquer informação que não possa ser confirmada pela própria imagem.
- Nunca tente identificar quem é a pessoa.
- Nunca infira ou mencione deficiência, diagnóstico, condição de saúde ou qualquer característica sensível.
- Evite suposições desnecessárias — descreva o que está visível, não o que você imagina que está acontecendo.
- Responda em português do Brasil, em uma ou duas frases curtas, sem formatação (sem markdown, sem aspas, sem prefixos como "Descrição:").`,

    en: `Describe the content of this image objectively and briefly, to be used as accessibility alternative text (screen readers).

Mandatory rules:
- Rely only on what is visually identifiable in the image.
- Never invent names, places, occupations or any information that the image itself cannot confirm.
- Never try to identify who the person is.
- Never infer or mention disability, diagnosis, health condition or any sensitive characteristic.
- Avoid unnecessary assumptions — describe what is visible, not what you imagine is happening.
- Answer in English, in one or two short sentences, with no formatting (no markdown, no quotation marks, no prefixes such as "Description:").`,

    es: `Describe el contenido de esta imagen de forma objetiva y breve, para usarse como texto alternativo de accesibilidad (lectores de pantalla).

Reglas obligatorias:
- Básate únicamente en lo que es visualmente identificable en la imagen.
- Nunca inventes nombres, lugares, profesiones ni información que la propia imagen no pueda confirmar.
- Nunca intentes identificar quién es la persona.
- Nunca infieras ni menciones discapacidad, diagnóstico, condición de salud ni ninguna característica sensible.
- Evita suposiciones innecesarias: describe lo que se ve, no lo que imaginas que está ocurriendo.
- Responde en español, en una o dos frases cortas, sin formato (sin markdown, sin comillas, sin prefijos como "Descripción:").`
};

/** Idiomas que o Site oferece; qualquer outro valor cai no português. */
export const IDIOMAS_SUPORTADOS = Object.keys(PROMPTS);

// Mesmo limite do campo `descricao` do anexo (ver validarDescricaoAnexo em
// postagemValidator.js); nunca confia cegamente no tamanho da resposta do modelo.
const MAX_CARACTERES_RESPOSTA = 500;

/**
 * Prefixos que o modelo às vezes cola na frente da descrição apesar da instrução. Tirar o prefixo
 * é melhor do que recusar a resposta: o texto depois dele é uma descrição boa.
 */
const PREFIXOS = /^\s*(alt(\s*text)?|descri(ç|c)(ã|a)o|description|descripci(ó|o)n|texto alternativo|imagem|image|imagen)\s*[:\-–]\s*/i;

/**
 * Sinais de que a resposta não é uma descrição de imagem: um modelo gratuito às vezes devolve o
 * resíduo de outra coisa (classificação de moderação, recusa, mensagem de sistema) em vez do texto
 * pedido. Confirmado em teste real: um modelo já devolveu literalmente "User Safety: safe".
 *
 * São FRASES, não palavras soltas, de propósito. "safety" e "blocked" aparecem em descrição
 * legítima em inglês ("a safety helmet", "a blocked doorway"): recusar por causa delas quebraria o
 * recurso justamente no idioma em que a pessoa mais depende dele.
 *
 * Nunca deixa esse tipo de texto virar a descrição de acessibilidade de alguém: prefere tentar
 * outro modelo, e falhar com uma mensagem amigável, a entregar uma "descrição" que não descreve
 * nada.
 */
const PADRAO_RESPOSTA_INVALIDA = new RegExp(
    [
        "user safety",
        "safety\\s*[:=]\\s*(un)?safe",
        "\\bmoderation\\b",
        "content polic",
        "policy violation",
        "cannot (assist|help|provide|comply)",
        "can'?t (assist|help|provide|comply)",
        "i'?m sorry",
        "as an ai",
        "n(ã|a)o posso (ajudar|assistir|processar|descrever)",
        "no puedo (ayudar|asistir|procesar|describir)",
        "lo siento",
        "como una (ia|inteligencia artificial)"
    ].join("|"),
    "i"
);

/** Deixa o texto no formato de uma descrição: sem aspas, sem prefixo, sem markdown, sem cortar palavra. */
function limpar(bruto) {
    let texto = String(bruto)
        .replace(/```[a-z]*\n?|```/gi, " ")
        .replace(/[*_`#]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const semPrefixo = texto.replace(PREFIXOS, "");
    const tinhaPrefixo = semPrefixo !== texto;

    texto = semPrefixo.replace(/^["'“”«»]+|["'“”«»]+$/g, "").trim();

    // Tirar o prefixo tira também a maiúscula da frase ("Descrição: um gato..." vira "um
    // gato..."). Só repõe quando a primeira palavra é toda minúscula: nomes como "iPhone"
    // continuam como são.
    if (tinhaPrefixo && /^[a-zà-ÿ]+\b/.test(texto)) {
        texto = texto[0].toUpperCase() + texto.slice(1);
    }

    if (texto.length <= MAX_CARACTERES_RESPOSTA) {
        return texto;
    }

    // Corta no último espaço antes do limite, para a descrição não terminar no meio de uma palavra.
    const cortado = texto.slice(0, MAX_CARACTERES_RESPOSTA);
    const ultimoEspaco = cortado.lastIndexOf(" ");

    return (ultimoEspaco > MAX_CARACTERES_RESPOSTA * 0.6 ? cortado.slice(0, ultimoEspaco) : cortado).trim();
}

function pareceDescricaoValida(texto) {
    if (!texto || texto.length < 8) return false;
    if (!texto.includes(" ")) return false; // uma descrição real sempre tem mais de uma palavra
    if (PADRAO_RESPOSTA_INVALIDA.test(texto)) return false;
    return true;
}

/**
 * Sugere a descrição acessível de uma imagem com um modelo de visão da OpenRouter. Nada é salvo
 * aqui: o texto volta para o usuário revisar.
 */
class SugestaoDescricaoService {
    /** Sem chave da OpenRouter configurada, o recurso fica indisponível, mas nunca derruba a aplicação. */
    disponivel() {
        return OpenRouterService.disponivel();
    }

    /**
     * @param {Buffer} imagemBuffer
     * @param {string} mimetype
     * @param {string} [idioma] - "pt", "en" ou "es"; qualquer outro valor vira "pt".
     */
    async sugerir(imagemBuffer, mimetype, idioma = "pt") {
        const escolhido = IDIOMAS_SUPORTADOS.includes(idioma) ? idioma : "pt";

        // A limpeza roda ANTES de aceitar a resposta: um modelo que respondeu
        // `"Descrição: duas pessoas conversando"` deu uma descrição boa, e recusá-la por causa do
        // prefixo mandaria o pedido para o modelo seguinte sem motivo.
        const { texto } = await OpenRouterService.gerarTextoSobreImagem(
            imagemBuffer,
            mimetype,
            PROMPTS[escolhido],
            { aceitar: (bruto) => pareceDescricaoValida(limpar(bruto)) }
        );

        const descricao = limpar(texto);

        if (!pareceDescricaoValida(descricao)) {
            // Não deveria acontecer (`aceitar` já barrou), mas a descrição de acessibilidade de
            // alguém nunca sai daqui sem passar por esta porta.
            console.error(
                JSON.stringify({
                    nivel: "error",
                    servico: "SugestaoDescricaoService",
                    motivo: "resposta_nao_parece_descricao",
                    // O texto em si nunca é sensível (não é dado do usuário),
                    // só registra pra diagnóstico de qual modelo devolveu isso.
                    resposta: descricao.slice(0, 200)
                })
            );
            throw ErroApi.servicoIndisponivel(
                "O serviço de sugestão não conseguiu gerar uma descrição válida para esta imagem. Tente novamente ou escreva a descrição manualmente."
            );
        }

        return descricao;
    }
}

export default new SugestaoDescricaoService();
