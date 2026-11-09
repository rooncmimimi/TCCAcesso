import { createFileRoute } from "@tanstack/react-router";

import { PaginaDocumentoLegal } from "@/components/legal/PaginaDocumentoLegal";
import { TERMOS_DE_USO } from "@/dados/documentosLegais";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: textoDaPagina("termos.termosDeUsoAcesso") },
      { name: "description", content: textoDaPagina("termos.asRegrasDeUsoDaPlataforma") },
    ],
  }),
  component: () => <PaginaDocumentoLegal doc={TERMOS_DE_USO} />,
});
