import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import ErroApi from "./ErroApi.js";

/** Marcador de fim de página que o pdf-parse insere entre páginas (ex.: "-- 1 of 2 --"); nunca é conteúdo do currículo. */
const MARCADOR_PAGINA_PDF = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm;

/**
 * Extração de texto puro de PDF/DOCX: sem IA, sem chamada externa, 100%
 * local. Currículo em DOC (formato binário antigo) e PDF escaneado (imagem,
 * sem texto real) não têm solução aqui: retornam um erro claro em vez de
 * inventar um resultado vazio ou incompleto sem explicação.
 */
const MENSAGEM_ARQUIVO_ILEGIVEL =
    "Não foi possível ler este arquivo. Ele pode estar corrompido ou protegido por senha. Salve-o de novo como PDF ou DOCX e tente outra vez.";

export async function extrairTextoDocumento(buffer, mimetype) {
    if (mimetype === "application/pdf") {
        const parser = new PDFParse({ data: buffer });

        try {
            const resultado = await parser.getText();
            const texto = (resultado.text ?? "").replace(MARCADOR_PAGINA_PDF, "").trim();

            if (!texto) {
                throw ErroApi.requisicaoInvalida(
                    "Não foi possível extrair texto deste PDF — ele pode ser uma imagem escaneada. Envie um PDF com texto selecionável ou um DOCX."
                );
            }

            return texto;
        } catch (erro) {
            // Um PDF corrompido ou protegido faz a biblioteca lançar um erro cru, que viraria um erro
            // interno 500 sem explicação. Erros nossos (como o de PDF escaneado) passam como estão.
            if (erro instanceof ErroApi) throw erro;

            throw ErroApi.requisicaoInvalida(MENSAGEM_ARQUIVO_ILEGIVEL);
        } finally {
            await parser.destroy().catch(() => {});
        }
    }

    if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        let resultado;

        try {
            resultado = await mammoth.extractRawText({ buffer });
        } catch {
            throw ErroApi.requisicaoInvalida(MENSAGEM_ARQUIVO_ILEGIVEL);
        }

        const texto = (resultado.value ?? "").trim();

        if (!texto) {
            throw ErroApi.requisicaoInvalida("Não foi possível extrair texto deste arquivo DOCX.");
        }

        return texto;
    }

    throw ErroApi.requisicaoInvalida(
        "Extração automática só é suportada para PDF e DOCX. Arquivos .doc (formato antigo do Word) não são suportados — salve como .docx ou PDF e envie novamente."
    );
}
