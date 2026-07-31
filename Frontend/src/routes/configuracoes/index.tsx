import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  Bell,
  ChevronRight,
  Eye,
  HelpCircle,
  Lock,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — ACESSO" },
      { name: "description", content: "Gerencie conta, segurança, visibilidade, notificações, dados e acessibilidade." },
      { property: "og:title", content: "Configurações — ACESSO" },
      { property: "og:description", content: "Central de preferências da sua conta ACESSO." },
    ],
  }),
  component: Configuracoes,
});

const secoes = [
  {
    icon: UserCog,
    titulo: "Preferências da conta",
    itens: [
      "Nome, localidade e setor",
      "Dados demográficos pessoais",
      "Modo escuro e exibição",
      "Idioma da interface",
      "Reprodução automática de vídeos",
      "Efeitos sonoros",
      "Encerrar ou pausar conta",
    ],
  },
  {
    icon: Lock,
    titulo: "Acesso e segurança",
    itens: [
      "Endereços de e-mail",
      "Números de telefone",
      "Alterar senha",
      "Sessões ativas",
      "Autenticação de dois fatores",
    ],
  },
  {
    icon: Eye,
    titulo: "Visibilidade",
    itens: [
      "Quem pode ver seu perfil",
      "Visibilidade do e-mail e telefone",
      "Visibilidade de conexões",
      "Status de atividade",
      "Usuários bloqueados",
    ],
  },
  {
    icon: Bell,
    titulo: "Notificações",
    itens: [
      "Vagas e candidaturas",
      "Mensagens",
      "Publicações e comentários",
      "Atualizações da sua rede",
      "Notícias de inclusão",
    ],
  },
  {
    icon: ShieldCheck,
    titulo: "Privacidade dos dados",
    itens: [
      "Baixar seus dados",
      "Gerenciar permissões de dados",
      "Limpar histórico de pesquisa",
      "Quem pode entrar em contato",
      "Dados de currículo e candidaturas",
    ],
  },
];

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
            <h2 className="text-lg font-bold text-primary">Configurações de acessibilidade</h2>
            <p className="text-sm text-primary/80">
              Contraste, fonte, espaçamentos, voz, Libras e navegação por teclado — com
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
                  <li key={i}>
                    <button
                      type="button"
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium hover:bg-secondary"
                    >
                      <span className="min-w-0 truncate">{i}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
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
