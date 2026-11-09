import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { CentralDeComunicacao } from "@/components/comunicacao/CentralDeComunicacao";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/comunicacao")({
  head: () => ({
    meta: [
      { title: "Central de comunicação — ACESSO" },
      { name: "description", content: "Cartões e frases prontas para mostrar, ouvir ou copiar em entrevistas e conversas." },
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
