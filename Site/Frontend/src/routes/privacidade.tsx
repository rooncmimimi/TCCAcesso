import { createFileRoute } from "@tanstack/react-router";

import { PaginaDocumentoLegal } from "@/components/legal/PaginaDocumentoLegal";
import { AVISO_DE_PRIVACIDADE } from "@/dados/documentosLegais";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Aviso de Privacidade — ACESSO" },
      { name: "description", content: "Como o ACESSO trata os seus dados pessoais." },
    ],
  }),
  component: () => <PaginaDocumentoLegal doc={AVISO_DE_PRIVACIDADE} />,
});
