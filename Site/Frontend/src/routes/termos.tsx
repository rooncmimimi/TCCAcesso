import { createFileRoute } from "@tanstack/react-router";

import { PaginaDocumentoLegal } from "@/components/legal/PaginaDocumentoLegal";
import { TERMOS_DE_USO } from "@/dados/documentosLegais";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — ACESSO" },
      { name: "description", content: "As regras de uso da plataforma ACESSO." },
    ],
  }),
  component: () => <PaginaDocumentoLegal doc={TERMOS_DE_USO} />,
});
