import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { SecaoSessoes } from "@/components/configuracoes/SecaoSessoes";
import { metaPagina, dic, useT } from "@/i18n";

export const Route = createFileRoute("/configuracoes/seguranca")({
  head: () => metaPagina(dic().configuracoes.seguranca.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Seguranca />
    </GuardaAcesso>
  ),
});

function Seguranca() {
  const t = useT();
  const ts = t.configuracoes.seguranca;

  return (
    <EstruturaApp>
      <Link
        to="/configuracoes"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t.configuracoes.voltarParaConfiguracoes}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Lock className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{ts.titulo}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{ts.texto}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <SecaoSessoes />
      </div>
    </EstruturaApp>
  );
}
