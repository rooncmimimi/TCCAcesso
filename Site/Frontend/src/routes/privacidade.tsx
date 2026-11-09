import { createFileRoute } from "@tanstack/react-router";

import { PaginaDocumentoLegal } from "@/components/legal/PaginaDocumentoLegal";
import { AVISO_DE_PRIVACIDADE } from "@/dados/documentosLegais";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: textoDaPagina("privacidade.avisoDePrivacidadeAcesso") },
      { name: "description", content: textoDaPagina("privacidade.comoOAcessoTrataOsSeusDados") },
    ],
  }),
  component: () => <PaginaDocumentoLegal doc={AVISO_DE_PRIVACIDADE} />,
});
