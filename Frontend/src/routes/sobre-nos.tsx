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

export const Route = createFileRoute("/sobre-nos")({
  head: () => ({
    meta: [
      { title: "Sobre nós — ACESSO" },
      {
        name: "description",
        content:
          "Conheça a missão do ACESSO, nosso compromisso com a acessibilidade e como funciona a plataforma que conecta talentos PCD e profissionais 50+ a empresas inclusivas.",
      },
      { property: "og:title", content: "Sobre nós — ACESSO" },
      {
        property: "og:description",
        content: "Missão, acessibilidade e como funciona o ACESSO.",
      },
    ],
  }),
  component: SobreNos,
});

const pilares = [
  {
    icon: HeartHandshake,
    titulo: "Missão",
    texto:
      "Conectar pessoas com deficiência e profissionais 50+ a oportunidades de trabalho reais, em empresas que praticam inclusão de verdade.",
  },
  {
    icon: Accessibility,
    titulo: "Acessibilidade",
    texto:
      "Seguimos as diretrizes WCAG 2.2: navegação por teclado, leitores de tela, VLibras, leitura por voz e ajustes de contraste e tipografia em toda a plataforma.",
  },
  {
    icon: ShieldCheck,
    titulo: "Empresas verificadas",
    texto:
      "Cada empresa parceira passa por uma verificação antes de publicar vagas, e cada vaga pode declarar seus recursos de acessibilidade.",
  },
];

const passos = [
  { titulo: "Crie sua conta", texto: "Cadastre-se como candidato ou empresa em poucos minutos." },
  {
    titulo: "Personalize sua experiência",
    texto: "Ajuste contraste, fonte, leitura por voz e VLibras nas configurações de acessibilidade.",
  },
  {
    titulo: "Encontre oportunidades",
    texto: "Busque vagas por cidade, modalidade e exclusividade PCD, e candidate-se com poucos cliques.",
  },
  {
    titulo: "Converse em tempo real",
    texto: "Fale diretamente com empresas pelo chat e acompanhe notificações sobre suas candidaturas.",
  },
];

function SobreNos() {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Pular para o conteúdo principal
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4">
          <Link to="/" aria-label="ACESSO — página inicial" className="min-w-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button asChild className="min-h-11">
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <section className="mx-auto max-w-6xl px-4 py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" /> Sobre o ACESSO
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Inclusão profissional que começa na acessibilidade da própria plataforma
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            O ACESSO é uma rede profissional criada para reduzir as barreiras entre pessoas com
            deficiência, profissionais 50+ e empresas comprometidas com a diversidade.
          </p>
        </section>

        <section aria-labelledby="pilares" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="pilares" className="text-3xl font-extrabold">
              Nossos pilares
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {pilares.map((p) => (
                <li key={p.titulo}>
                  <Card className="h-full border-border shadow-none">
                    <CardContent className="p-6">
                      <span
                        aria-hidden="true"
                        className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"
                      >
                        <p.icon className="size-5" />
                      </span>
                      <h3 className="text-lg font-bold">{p.titulo}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{p.texto}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="como-funciona" className="text-3xl font-extrabold">
            Como funciona
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {passos.map((p, i) => (
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
                    Fale com a gente
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-primary-foreground/90">
                    <Mail className="size-4 shrink-0" aria-hidden="true" />
                    <a href="mailto:contato@acesso.com.br" className="underline">
                      contato@acesso.com.br
                    </a>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-primary-foreground/90">
                    <MessageCircleHeart className="size-4 shrink-0" aria-hidden="true" />
                    Dúvidas, sugestões e denúncias são bem-vindas a qualquer momento.
                  </p>
                </div>
                <Button asChild size="lg" variant="secondary" className="min-h-12 shrink-0 text-base">
                  <Link to="/cadastro">
                    <Users2 aria-hidden="true" /> Criar minha conta
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
            <Languages className="size-4 shrink-0" aria-hidden="true" /> ACESSO · WCAG 2.2 · VLibras
            integrado
          </p>
        </div>
      </footer>
    </div>
  );
}
