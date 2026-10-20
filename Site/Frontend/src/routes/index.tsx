import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Accessibility,
  ArrowRight,
  Building2,
  Ear,
  Eye,
  Headphones,
  Languages,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import raioAcesso from "@/assets/raio-acesso.svg";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsentimentoVozDialog } from "@/components/acessibilidade/ConsentimentoVozDialog";
import { VagaDestaqueCard } from "@/components/inicio/VagaDestaqueCard";
import { EmpresaParceiraCard } from "@/components/inicio/EmpresaParceiraCard";
import { publicoService } from "@/services/publico.service";
import { useSessao } from "@/hooks/useSessao";
import { metaPagina, SeletorIdioma, dic, useT } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => metaPagina(dic().inicio.meta),
  component: Inicio,
});

// Cada recurso do card "Recursos ativos nesta página" tem sua própria cor de
// identidade (não um token único): detalhe visual específico desta seção.
// Os textos de cada item vêm do dicionário (`inicio.recursosAtivos`), na mesma ordem.
const RECURSOS_ATIVOS = [
  { icon: Headphones, classeCor: "bg-[#21A848] text-white" },
  { icon: Languages, classeCor: "bg-[#FAD905] text-[#050407]" },
  { icon: Ear, classeCor: "bg-[#0A98E7] text-white" },
  { icon: Accessibility, classeCor: "bg-[#EB1B25] text-white" },
];

// Títulos e textos vêm do dicionário (`inicio.recursos`), na mesma ordem dos ícones.
const ICONES_RECURSOS = [Headphones, Languages, Eye, ShieldCheck];

function Inicio() {
  const t = useT();
  const ti = t.inicio;
  const { inicializado, autenticado } = useSessao();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["publico", "home"],
    queryFn: () => publicoService.home(),
    staleTime: 60_000,
  });

  const vagasDestaque = data?.vagasDestaque ?? [];
  const empresasParceiras = data?.empresasParceiras ?? [];

  // Quem já está autenticado não deve ver a Inicio de visitante (com
  // "Entrar"/"Criar conta"): o destino natural é o Feed, igual a quem
  // acabou de fazer login. Só decide depois de `inicializado` para não
  // piscar a Inicio antes de a sessão salva ser lida.
  if (inicializado && autenticado) {
    return <Navigate to="/feed" />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <ConsentimentoVozDialog />
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
            <SeletorIdioma compacto id="seletor-idioma-inicio" />
            <Button
              asChild
              variant="ghost"
              className="min-h-11 gap-1.5"
              aria-label={t.layout.configuracoesAcessibilidade}
            >
              <Link to="/configuracoes/acessibilidade">
                <Accessibility aria-hidden="true" />
                <span className="hidden sm:inline">{t.comum.acessibilidade}</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
              <Link to="/sobre-nos">{ti.sobreNos}</Link>
            </Button>
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
        {/* Hero; wrapper de largura total só pra conter o raio decorativo:
            a section em si é centralizada (max-w-6xl), então não sobra
            margem lateral dentro dela pra ele vazar sem cruzar o texto. */}
        <div className="relative overflow-hidden">
          <img
            src={raioAcesso}
            alt=""
            aria-hidden="true"
            className="raio-decorativo-home pointer-events-none absolute inset-0 z-0 block h-full w-full scale-[1.3] object-cover opacity-25"
          />

          <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div className="relative z-10">
            <Badge className="mb-5 gap-1.5 bg-primary-soft text-primary hover:bg-primary-soft">
              <Sparkles className="size-3.5" aria-hidden="true" /> {ti.selo}
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {ti.tituloPartes.antes}{" "}
              <span className="text-primary">{ti.tituloPartes.transformam}</span>{" "}
              <span className="text-destructive">{ti.tituloPartes.vidas}</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {ti.subtitulo}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-12 text-base">
                <Link to="/cadastro">
                  {ti.quero} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 text-base">
                {/* A conta de empresa nasce de uma conta de candidato, então o caminho começa lá. */}
                <Link to="/cadastro/candidato" search={{ depois: "empresa" }}>
                  <Building2 aria-hidden="true" /> {ti.souEmpresa}
                </Link>
              </Button>
            </div>
          </div>

          <Card className="relative z-10 overflow-hidden border-border shadow-card">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {ti.recursosAtivosTitulo}
              </p>
              <ul className="space-y-3">
                {RECURSOS_ATIVOS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-secondary p-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.classeCor}`}
                    >
                      <item.icon className="size-5" />
                    </span>
                    <span className="min-w-0 text-sm font-medium">{ti.recursosAtivos[i]}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="min-h-11 w-full bg-foreground text-background hover:bg-foreground/90">
                <Link to="/configuracoes/acessibilidade">
                  {ti.configurarAgora} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          </section>
        </div>

        <section aria-labelledby="recursos" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="recursos" className="text-3xl font-extrabold">
              {ti.recursosTitulo}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {ti.recursosSubtitulo}
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ti.recursos.map((r, i) => {
                const Icone = ICONES_RECURSOS[i];
                return (
                <li key={r.titulo}>
                  <Card className="h-full border-border shadow-none transition-shadow hover:shadow-card">
                    <CardContent className="p-5">
                      <span
                        aria-hidden="true"
                        className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"
                      >
                        <Icone className="size-5" />
                      </span>
                      <h3 className="text-base font-bold">{r.titulo}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{r.texto}</p>
                    </CardContent>
                  </Card>
                </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="vagas-destaque" className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <h2 id="vagas-destaque" className="text-3xl font-extrabold">
                {ti.destaqueTitulo}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {ti.destaqueSubtitulo}
              </p>
            </div>
            <Button asChild variant="ghost" className="min-h-11 shrink-0">
              <Link to="/vagas">
                {ti.verTodas} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="mt-8 text-muted-foreground">{ti.erroDestaque}</p>
          ) : vagasDestaque.length === 0 ? (
            <p className="mt-8 text-muted-foreground">{ti.semDestaque}</p>
          ) : (
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {vagasDestaque.slice(0, 4).map((v) => (
                <li key={v.id}>
                  <VagaDestaqueCard vaga={v} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {!isLoading && empresasParceiras.length > 0 && (
          <section aria-labelledby="parceiras" className="border-t border-border bg-card">
            <div className="mx-auto max-w-6xl px-4 py-14">
              <h2 id="parceiras" className="text-3xl font-extrabold">
                {ti.parceiras}
              </h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {empresasParceiras.map((e) => (
                  <li key={e.id}>
                    <EmpresaParceiraCard empresa={e} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Chamada final para criar conta */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Card className="border-none bg-primary text-primary-foreground shadow-card">
            <CardContent className="grid items-center gap-6 p-8 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <h2 className="text-3xl font-extrabold">{ti.chamadaTitulo}</h2>
                <p className="mt-2 text-primary-foreground/85">
                  {ti.chamadaTexto}
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="min-h-12 shrink-0 text-base">
                <Link to="/cadastro">
                  <Users aria-hidden="true" /> {ti.criarMinhaConta}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Logo />
          <nav aria-label={ti.rodapeAria} className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <Link to="/sobre-nos" className="hover:underline">
              {ti.sobreNos}
            </Link>
            <a href="mailto:projetoacessoinclusivo@gmail.com" className="hover:underline">
              {t.comum.faleConosco}
            </a>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-8 text-sm text-muted-foreground">
          {ti.rodapeLinha}
        </div>
      </footer>
    </div>
  );
}
