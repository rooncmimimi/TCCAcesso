import { FileText } from "lucide-react";

import { urlArquivo } from "@/services/uploads.service";
import type { AnexoPostagem } from "@/types";

/** Exibe os anexos de uma publicação: galeria de imagens e links para documentos. */
export function GaleriaAnexos({ anexos }: { anexos: AnexoPostagem[] }) {
  if (!anexos?.length) return null;

  const imagens = anexos.filter((a) => a.tipo === "imagem");
  const documentos = anexos.filter((a) => a.tipo === "documento");

  return (
    <div className="mt-4 space-y-3">
      {imagens.length > 0 && (
        <ul
          className={`grid gap-2 ${imagens.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          aria-label="Imagens anexadas à publicação"
        >
          {imagens.map((imagem) => (
            <li key={imagem.id}>
              <a
                href={urlArquivo(imagem.url)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <img
                  src={urlArquivo(imagem.url)}
                  alt={imagem.nomeOriginal ?? "Imagem anexada à publicação"}
                  className="max-h-96 w-full object-cover"
                  loading="lazy"
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      {documentos.length > 0 && (
        <ul className="space-y-2" aria-label="Documentos anexados à publicação">
          {documentos.map((documento) => (
            <li key={documento.id}>
              <a
                href={urlArquivo(documento.url)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{documento.nomeOriginal ?? "Documento anexado"}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GaleriaAnexos;
