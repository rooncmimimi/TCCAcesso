import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import ApiError from "./ApiError.js";

/** Marcador de fim de página que o pdf-parse insere entre páginas (ex.: "-- 1 of 2 --") — nunca é conteúdo do currículo. */
const MARCADOR_PAGINA_PDF = /^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm;

/**
 * Extração de texto puro de PDF/DOCX — sem IA, sem chamada externa, 100%
 * local. Currículo em DOC (formato binário antigo) e PDF escaneado (imagem,
 * sem texto real) não têm solução aqui: retornam um erro claro em vez de
 * inventar um resultado vazio ou incompleto sem explicação.
 */
export async function extrairTextoDocumento(buffer, mimetype) {
    if (mimetype === "application/pdf") {
        const parser = new PDFParse({ data: buffer });

        try {
            const resultado = await parser.getText();
            const texto = (resultado.text ?? "").replace(MARCADOR_PAGINA_PDF, "").trim();

            if (!texto) {
                throw ApiError.badRequest(
                    "Não foi possível extrair texto deste PDF — ele pode ser uma imagem escaneada. Envie um PDF com texto selecionável ou um DOCX."
                );
            }

            return texto;
        } finally {
            await parser.destroy();
        }
    }

    if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        const resultado = await mammoth.extractRawText({ buffer });
        const texto = (resultado.value ?? "").trim();

        if (!texto) {
            throw ApiError.badRequest("Não foi possível extrair texto deste arquivo DOCX.");
        }

        return texto;
    }

    throw ApiError.badRequest(
        "Extração automática só é suportada para PDF e DOCX. Arquivos .doc (formato antigo do Word) não são suportados — salve como .docx ou PDF e envie novamente."
    );
}
