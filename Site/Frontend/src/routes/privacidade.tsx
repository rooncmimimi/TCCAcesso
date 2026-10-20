import { createFileRoute } from "@tanstack/react-router";

import { PaginaDocumentoLegal } from "@/components/legal/PaginaDocumentoLegal";
import { dic, metaPagina } from "@/i18n";

export const Route = createFileRoute("/privacidade")({
  head: () => metaPagina(dic().legal.privacidade.meta),
  component: () => <PaginaDocumentoLegal chave="privacidade" />,
});
