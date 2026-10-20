import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  Bell,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  Languages,
  UserCog,
} from "lucide-react";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Card, CardContent } from "@/components/ui/card";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { metaPagina, SeletorIdioma, dic, useT } from "@/i18n";

export const Route = createFileRoute("/configuracoes/")({
  head: () => metaPagina(dic().configuracoes.index.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Configuracoes />
    </GuardaAcesso>
  ),
});

// Os títulos e rótulos vêm do dicionário (`configuracoes.index.secoes`), na mesma ordem.
const secoes = [
  {
    icon: UserCog,
    destinos: ["/configuracoes/conta", "/configuracoes/senha", "/configuracoes/seguranca"],
  },
  {
    icon: Bell,
    destinos: ["/configuracoes/notificacoes"],
  },
  {
    icon: ShieldCheck,
    destinos: ["/configuracoes/privacidade", "/configuracoes/bloqueados"],
  },
] as const;

function Configuracoes() {
  const t = useT();
  const tc = t.configuracoes.index;

  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{tc.titulo}</h1>
      <p className="mt-2 text-muted-foreground">
        {tc.subtitulo}
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
            <h2 className="text-lg font-bold text-primary">{tc.acessibilidadeTitulo}</h2>
            <p className="text-sm text-primary/80">
              {tc.acessibilidadeTexto}
            </p>
          </div>
          <Link
            to="/configuracoes/acessibilidade"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {tc.abrir} <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"
          >
            <Languages className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{tc.idiomaTitulo}</h2>
            <p className="text-sm text-muted-foreground">{tc.idiomaTexto}</p>
          </div>
          <SeletorIdioma id="seletor-idioma-configuracoes" />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {secoes.map((s, indice) => (
          <Card key={tc.secoes[indice].titulo} className="shadow-none">
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <s.icon className="size-5 shrink-0 text-primary" aria-hidden="true" /> {tc.secoes[indice].titulo}
              </h2>
              <ul className="mt-3 space-y-1">
                {s.destinos.map((destino, i) => (
                  <li key={destino}>
                    <Link
                      to={destino}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium hover:bg-secondary"
                    >
                      <span className="min-w-0 truncate">{tc.secoes[indice].itens[i]}</span>
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
              <HelpCircle className="size-5 shrink-0 text-primary" aria-hidden="true" /> {tc.ajuda}
            </h2>
            <a
              href="mailto:projetoacessoinclusivo@gmail.com"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline"
            >
              {tc.falarComEquipe}
            </a>
          </CardContent>
        </Card>
      </div>
    </EstruturaApp>
  );
}
