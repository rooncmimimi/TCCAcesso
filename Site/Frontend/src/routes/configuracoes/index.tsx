import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  Bell,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useIdioma } from "@/hooks/useIdioma";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Card, CardContent } from "@/components/ui/card";
import { GuardaAcesso } from "@/components/GuardaAcesso";

export const Route = createFileRoute("/configuracoes/")({
  head: () => ({
    meta: [
      { title: "Configurações — ACESSO" },
      { name: "description", content: "Gerencie conta, segurança, notificações, acessibilidade e aparência." },
      { property: "og:title", content: "Configurações — ACESSO" },
      { property: "og:description", content: "Central de preferências da sua conta ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Configuracoes />
    </GuardaAcesso>
  ),
});

const secoes = [
  {
    icon: UserCog,
    titulo: "configuracoes.index.conta",
    itens: [{ label: "configuracoes.index.meusDadosEPerfil", to: "/configuracoes/conta" }],
  },
  {
    icon: Bell,
    titulo: "cabecalho.notificacoes",
    itens: [{ label: "configuracoes.index.preferenciasDeNotificacao", to: "/configuracoes/notificacoes" }],
  },
  {
    icon: ShieldCheck,
    titulo: "rodape.privacidadeSeguranca",
    itens: [
      { label: "configuracoes.index.visibilidadeDoPerfilEMensagens", to: "/configuracoes/privacidade" },
      { label: "configuracoes.index.usuariosBloqueados", to: "/configuracoes/bloqueados" },
      { label: "configuracoes.index.alterarSenha", to: "/configuracoes/senha" },
      { label: "configuracoes.index.sessoesEContasConectadas", to: "/configuracoes/seguranca" },
    ],
  },
] as const;

function Configuracoes() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("cabecalho.configuracoes")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("configuracoes.index.tudoOQueVocePrecisaParaDeixarO")}
      </p>

      <Card className="mt-6 border-primary/30 bg-primary-soft shadow-none">
        <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
          >
            <Accessibility className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-primary">{t("configuracoes.index.acessibilidadeEAparencia")}</h2>
            <p className="text-sm text-primary/80">
              {t("configuracoes.index.contrasteTemaClaroEscuroFonte")}
            </p>
          </div>
          <Link
            to="/configuracoes/acessibilidade"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Abrir <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {secoes.map((s) => (
          <Card key={s.titulo} className="shadow-none">
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <s.icon className="size-5 shrink-0 text-primary" aria-hidden="true" /> {t(s.titulo)}
              </h2>
              <ul className="mt-3 space-y-1">
                {s.itens.map((i) => (
                  <li key={i.label}>
                    <Link
                      to={i.to}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium hover:bg-secondary"
                    >
                      <span className="min-w-0 truncate">{t(i.label)}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        <Card className="shadow-none">
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <HelpCircle className="size-5 shrink-0 text-primary" aria-hidden="true" /> {t("configuracoes.index.ajuda")}
            </h2>
            <Link to="/fale-conosco" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline">
              {t("configuracoes.index.falarComAEquipeDoAcesso")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </EstruturaApp>
  );
}
