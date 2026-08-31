import OpenRouterService from "./OpenRouterService.js";

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

class SugestaoDescricaoService {
    /** Sem chave da OpenRouter configurada, o recurso fica indisponível — nunca derruba a aplicação. */
    disponivel() {
        return OpenRouterService.disponivel();
    }

    async sugerir(imagemBuffer, mimetype) {
        const texto = await OpenRouterService.gerarTextoSobreImagem(
            imagemBuffer,
            mimetype,
            PROMPT_DESCRICAO_IMAGEM
        );

        return texto
            .replace(/^["'“”]+|["'“”]+$/g, "")
            .trim()
            .slice(0, MAX_CARACTERES_RESPOSTA);
    }
}

export default new SugestaoDescricaoService();
