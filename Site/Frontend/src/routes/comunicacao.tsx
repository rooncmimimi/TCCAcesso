import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { CentralDeComunicacao } from "@/components/comunicacao/CentralDeComunicacao";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/comunicacao")({
  head: () => ({
    meta: [
      { title: textoDaPagina("comunicacao.centralDeComunicacaoAcesso") },
      { name: "description", content: textoDaPagina("comunicacao.cartoesEFrasesProntasPara") },
    ],
  }),
  component: ComunicacaoPagina,
});

function ComunicacaoPagina() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("comunicacao.centralDeComunicacao")}</h1>
      <p className="mt-2 text-muted-foreground">{t("comunicacao.frasesProntasParaVoceMostrarNa")}</p>
      <CentralDeComunicacao />
    </EstruturaApp>
  );
}
