import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  Bell,
  ChevronRight,
  HelpCircle,
  Lock,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
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
    titulo: "Conta",
    itens: [
      { label: "Meus dados e perfil", to: "/configuracoes/conta" },
      { label: "Alterar senha", to: "/configuracoes/senha" },
      { label: "Sessões ativas", to: "/configuracoes/seguranca" },
    ],
  },
  {
    icon: Lock,
    titulo: "Segurança",
    itens: [{ label: "Autenticação de dois fatores", to: "/configuracoes/seguranca" }],
  },
  {
    icon: Bell,
    titulo: "Notificações",
    itens: [{ label: "Preferências de notificação", to: "/configuracoes/notificacoes" }],
  },
  {
    icon: ShieldCheck,
    titulo: "Privacidade",
    itens: [
      { label: "Perfil público", to: "/configuracoes/privacidade" },
      { label: "Usuários bloqueados", to: "/configuracoes/bloqueados" },
    ],
  },
] as const;

function Configuracoes() {
  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Configurações</h1>
      <p className="mt-2 text-muted-foreground">
        Tudo o que você precisa para deixar o ACESSO do seu jeito.
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
            <h2 className="text-lg font-bold text-primary">Acessibilidade e aparência</h2>
            <p className="text-sm text-primary/80">
              Contraste, tema claro/escuro, fonte, espaçamentos, voz, Libras e navegação por teclado — com
              pré-visualização em tempo real.
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
                <s.icon className="size-5 shrink-0 text-primary" aria-hidden="true" /> {s.titulo}
              </h2>
              <ul className="mt-3 space-y-1">
                {s.itens.map((i) => (
                  <li key={i.label}>
                    <Link
                      to={i.to}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium hover:bg-secondary"
                    >
                      <span className="min-w-0 truncate">{i.label}</span>
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
              <HelpCircle className="size-5 shrink-0 text-primary" aria-hidden="true" /> Ajuda
            </h2>
            <Link
              to="/ajuda"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline"
            >
              Ir para a central de ajuda
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
