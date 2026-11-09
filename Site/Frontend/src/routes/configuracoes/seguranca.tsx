import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { SecaoAtividadeDeSeguranca } from "@/components/configuracoes/SecaoAtividadeDeSeguranca";
import { SecaoContaComprometida } from "@/components/configuracoes/SecaoContaComprometida";
import { SecaoContasConectadas } from "@/components/configuracoes/SecaoContasConectadas";
import { SecaoDispositivosConfiaveis } from "@/components/configuracoes/SecaoDispositivosConfiaveis";
import { SecaoSessoes } from "@/components/configuracoes/SecaoSessoes";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/configuracoes/seguranca")({
  head: () => ({
    meta: [
      { title: "Sessões e contas conectadas — ACESSO" },
      { name: "description", content: "Gerencie a segurança da sua conta ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Seguranca />
    </GuardaAcesso>
  ),
});

function Seguranca() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <Link
        to="/configuracoes/privacidade"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para Privacidade e Segurança
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Lock className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("configuracoes.seguranca.sessoesEContasConectadas")}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{t("configuracoes.seguranca.protejaOAcessoASuaContaAcesso")}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <SecaoContasConectadas />
        <SecaoSessoes />
        <SecaoDispositivosConfiaveis />
        <SecaoAtividadeDeSeguranca />
        <SecaoContaComprometida />
      </div>
    </EstruturaApp>
  );
}
