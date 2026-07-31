import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  ArrowRight,
  Building2,
  CheckCircle2,
  Ear,
  Eye,
  Headphones,
  Languages,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceConsentDialog } from "@/components/accessibility/VoiceConsentDialog";
import { empresasParceiras, vagas } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ACESSO — Vagas inclusivas para PCD e profissionais 50+" },
      {
        name: "description",
        content:
          "Conectamos talentos PCD e profissionais 50+ a empresas comprometidas com inclusão. Acessibilidade real: VLibras, leitura por voz e preferências que acompanham você.",
      },
      { property: "og:title", content: "ACESSO — Vagas inclusivas para PCD e 50+" },
      {
        property: "og:description",
        content: "Oportunidades que transformam vidas, com acessibilidade desde o primeiro clique.",
      },
    ],
  }),
  component: Home,
});

const recursos = [
  {
    icon: Headphones,
    titulo: "Leitura por voz",
    texto: "A plataforma lê o conteúdo em voz alta enquanto você navega pelo teclado.",
  },
  {
    icon: Languages,
    titulo: "VLibras integrado",
    texto: "Tradutor oficial do Governo Federal disponível em todas as páginas.",
  },
  {
    icon: Eye,
    titulo: "Ajuste fino da leitura",
    texto: "Contraste, tamanho de fonte, espaçamento e fonte para dislexia.",
  },
  {
    icon: ShieldCheck,
    titulo: "Empresas verificadas",
    texto: "Vagas revisadas e recursos de acessibilidade declarados em cada anúncio.",
  },
];

function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <VoiceConsentDialog />
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
            <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
              <Link to="/ajuda">Ajuda</Link>
            </Button>
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
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <Badge className="mb-5 gap-1.5 bg-primary-soft text-primary hover:bg-primary-soft">
              <Sparkles className="size-3.5" aria-hidden="true" /> Acessibilidade desde o primeiro
              clique
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Conectando talentos PCD a oportunidades que{" "}
              <span className="text-primary">transformam vidas</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              O ACESSO é a rede profissional feita para pessoas com deficiência, profissionais 50+ e
              empresas que levam a inclusão a sério.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-12 text-base">
                <Link to="/cadastro">
                  Quero encontrar vagas <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 text-base">
                <Link to="/cadastro" search={{ perfil: "empresa" }}>
                  <Building2 aria-hidden="true" /> Sou empresa
                </Link>
              </Button>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["+2.400", "vagas inclusivas"],
                ["+180", "empresas verificadas"],
                ["100%", "telas acessíveis"],
              ].map(([valor, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span className="block font-display text-2xl font-extrabold text-primary">
                      {valor}
                    </span>
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <Card className="overflow-hidden border-border shadow-card">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Recursos ativos nesta página
              </p>
              <ul className="space-y-3">
                {[
                  { icon: Headphones, texto: "Leitura por voz pronta para ativar" },
                  { icon: Languages, texto: "VLibras disponível no canto da tela" },
                  { icon: Ear, texto: "Compatível com leitores de tela (NVDA, VoiceOver)" },
                  { icon: Accessibility, texto: "Contraste e tipografia ajustáveis" },
                ].map((item) => (
                  <li key={item.texto} className="flex items-start gap-3 rounded-xl bg-secondary p-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary"
                    >
                      <item.icon className="size-5" />
                    </span>
                    <span className="min-w-0 text-sm font-medium">{item.texto}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="secondary" className="min-h-11 w-full">
                <Link to="/configuracoes/acessibilidade">
                  Configurar acessibilidade agora <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Recursos */}
        <section aria-labelledby="recursos" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="recursos" className="text-3xl font-extrabold">
              Recursos do sistema
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Tudo o que você configura uma vez acompanha sua conta em qualquer dispositivo.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recursos.map((r) => (
                <li key={r.titulo}>
                  <Card className="h-full border-border shadow-none transition-shadow hover:shadow-card">
                    <CardContent className="p-5">
                      <span
                        aria-hidden="true"
                        className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"
                      >
                        <r.icon className="size-5" />
                      </span>
                      <h3 className="text-base font-bold">{r.titulo}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{r.texto}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Vagas em destaque */}
        <section aria-labelledby="vagas-destaque" className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <h2 id="vagas-destaque" className="text-3xl font-extrabold">
                Vagas em destaque
              </h2>
              <p className="mt-2 text-muted-foreground">
                Oportunidades com recursos de acessibilidade declarados.
              </p>
            </div>
            <Button asChild variant="ghost" className="min-h-11 shrink-0">
              <Link to="/vagas">
                Ver todas <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {vagas.slice(0, 4).map((v) => (
              <li key={v.id}>
                <Card className="h-full border-border shadow-none transition-shadow hover:shadow-card">
                  <CardContent className="p-5">
                    <h3 className="text-lg font-bold">{v.titulo}</h3>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {v.empresa} · {v.modalidade} · {v.local}
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {v.recursos.map((r) => (
                        <li key={r}>
                          <Badge variant="secondary" className="gap-1 font-medium">
                            <CheckCircle2 className="size-3" aria-hidden="true" /> {r}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* Empresas parceiras */}
        <section aria-labelledby="parceiras" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="parceiras" className="text-3xl font-extrabold">
              Empresas parceiras
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {empresasParceiras.map((e) => (
                <li
                  key={e.nome}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-4"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft font-display font-extrabold text-primary"
                  >
                    {e.nome[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{e.nome}</span>
                    <span className="block text-sm text-muted-foreground">
                      {e.setor} · {e.vagas} vagas
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Card className="border-none bg-primary text-primary-foreground shadow-card">
            <CardContent className="grid items-center gap-6 p-8 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <h2 className="text-3xl font-extrabold">Comece pela sua acessibilidade</h2>
                <p className="mt-2 text-primary-foreground/85">
                  Ao criar sua conta, você configura a experiência do jeito que funciona para você —
                  e vê cada mudança em tempo real.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="min-h-12 shrink-0 text-base">
                <Link to="/cadastro">
                  <Users aria-hidden="true" /> Criar minha conta
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Logo />
          <p className="text-sm text-muted-foreground">
            ACESSO · Plataforma de inclusão profissional · WCAG 2.2
          </p>
        </div>
      </footer>
    </div>
  );
}
