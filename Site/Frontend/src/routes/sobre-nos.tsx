import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  HeartHandshake,
  Languages,
  Mail,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { metaPagina, SeletorIdioma, dic, useT } from "@/i18n";

export const Route = createFileRoute("/sobre-nos")({
  head: () => metaPagina(dic().sobre.meta),
  component: SobreNos,
});

// Títulos e textos dos pilares vêm do dicionário (`sobre.pilares`), na mesma ordem dos ícones.
const ICONES_PILARES = [HeartHandshake, Accessibility, ShieldCheck];

function SobreNos() {
  const t = useT();
  const ts = t.sobre;

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        {t.comum.pularParaConteudo}
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4">
          <Link to="/" aria-label={t.layout.inicioAria} className="min-w-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <SeletorIdioma compacto id="seletor-idioma-sobre" />
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/entrar">{t.comum.entrar}</Link>
            </Button>
            <Button asChild className="min-h-11">
              <Link to="/cadastro">{t.comum.criarConta}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <section className="mx-auto max-w-6xl px-4 py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" /> {ts.selo}
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {ts.titulo}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {ts.texto}
          </p>
        </section>

        <section aria-labelledby="pilares" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="pilares" className="text-3xl font-extrabold">
              {ts.pilaresTitulo}
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {ts.pilares.map((p, i) => {
                const Icone = ICONES_PILARES[i];
                return (
                <li key={p.titulo}>
                  <Card className="h-full border-border shadow-none">
                    <CardContent className="p-6">
                      <span
                        aria-hidden="true"
                        className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"
                      >
                        <Icone className="size-5" />
                      </span>
                      <h3 className="text-lg font-bold">{p.titulo}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{p.texto}</p>
                    </CardContent>
                  </Card>
                </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="como-funciona" className="text-3xl font-extrabold">
            {ts.comoFuncionaTitulo}
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {ts.passos.map((p, i) => (
              <li key={p.titulo}>
                <Card className="h-full border-border shadow-none">
                  <CardContent className="flex gap-4 p-6">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold">{p.titulo}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="contato" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <Card className="border-none bg-primary text-primary-foreground shadow-card">
              <CardContent className="grid gap-6 p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <h2 id="contato" className="text-2xl font-extrabold">
                    {ts.contatoTitulo}
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-primary-foreground/90">
                    <Mail className="size-4 shrink-0" aria-hidden="true" />
                    <a href="mailto:projetoacessoinclusivo@gmail.com" className="underline">
                      projetoacessoinclusivo@gmail.com
                    </a>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-primary-foreground/90">
                    <MessageCircleHeart className="size-4 shrink-0" aria-hidden="true" />
                    {ts.contatoTexto}
                  </p>
                </div>
                <Button asChild size="lg" variant="secondary" className="min-h-12 shrink-0 text-base">
                  <Link to="/cadastro">
                    <Users2 aria-hidden="true" /> {t.inicio.criarMinhaConta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Logo />
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Languages className="size-4 shrink-0" aria-hidden="true" /> {ts.rodape}
          </p>
        </div>
      </footer>
    </div>
  );
}
