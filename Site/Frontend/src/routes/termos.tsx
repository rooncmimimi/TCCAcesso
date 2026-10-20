import { createFileRoute } from "@tanstack/react-router";

import { PaginaDocumentoLegal } from "@/components/legal/PaginaDocumentoLegal";
import { dic, metaPagina } from "@/i18n";

export const Route = createFileRoute("/termos")({
  head: () => metaPagina(dic().legal.termos.meta),
  component: () => <PaginaDocumentoLegal chave="termos" />,
});
