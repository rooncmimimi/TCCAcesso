import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { PaginaMinhaAcessibilidade } from "@/components/minha-acessibilidade/PaginaMinhaAcessibilidade";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/minha-acessibilidade")({
  head: () => ({
    meta: [
      { title: textoDaPagina("minha-acessibilidade.minhaAcessibilidadeAcesso") },
      {
        name: "description",
        content: textoDaPagina("minha-acessibilidade.registreSoParaVoceAsAdaptacoes"),
      },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato"]}>
      <MinhaAcessibilidadePagina />
    </GuardaAcesso>
  ),
});

function MinhaAcessibilidadePagina() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("minha-acessibilidade.minhaAcessibilidade")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("minha-acessibilidade.umLugarPrivadoParaDizerOQue")}
      </p>
      <PaginaMinhaAcessibilidade />
    </EstruturaApp>
  );
}
