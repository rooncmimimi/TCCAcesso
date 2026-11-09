import { useEffect } from "react";
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
import { textoDaPagina } from "@/i18n/textoDaPagina";
import raioAcesso from "@/assets/raio-acesso.svg";
import { Logo } from "@/components/Logo";
import { SeletorDeIdioma } from "@/components/SeletorDeIdioma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsentimentoVozDialog } from "@/components/acessibilidade/ConsentimentoVozDialog";
import { VagaDestaqueCard } from "@/components/inicio/VagaDestaqueCard";
import { EmpresaParceiraCard } from "@/components/inicio/EmpresaParceiraCard";
import { publicoService } from "@/services/publico.service";
import { useIdioma } from "@/hooks/useIdioma";
import { useSessao } from "@/hooks/useSessao";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: textoDaPagina("inicio.tituloDaAba") },
      {
        name: "description",
        content:
          textoDaPagina("index.conectamosTalentosPcdE"),
      },
      { property: "og:title", content: textoDaPagina("index.acessoVagasInclusivasParaPcdE") },
      {
        property: "og:description",
        content: textoDaPagina("index.oportunidadesQueTransformam"),
      },
    ],
  }),
  component: Inicio,
});

// Cada recurso do card "Recursos ativos nesta página" tem sua própria cor de
// identidade (não um token único): detalhe visual específico desta seção.
const RECURSOS_ATIVOS = [
  { icon: Headphones, chave: "inicio.ativo.voz", classeCor: "bg-[#21A848] text-white" },
  { icon: Languages, chave: "inicio.ativo.vlibras", classeCor: "bg-[#FAD905] text-[#050407]" },
  { icon: Ear, chave: "inicio.ativo.leitores", classeCor: "bg-[#0A98E7] text-white" },
  { icon: Accessibility, chave: "inicio.ativo.contraste", classeCor: "bg-[#EB1B25] text-white" },
] as const;

const recursos = [
  { icon: Headphones, titulo: "inicio.recurso.voz.titulo", texto: "inicio.recurso.voz.texto" },
  { icon: Languages, titulo: "inicio.recurso.vlibras.titulo", texto: "inicio.recurso.vlibras.texto" },
  { icon: Eye, titulo: "inicio.recurso.leitura.titulo", texto: "inicio.recurso.leitura.texto" },
  { icon: ShieldCheck, titulo: "inicio.recurso.empresas.titulo", texto: "inicio.recurso.empresas.texto" },
] as const;

function Inicio() {
  const { t } = useIdioma();
  const { inicializado, autenticado } = useSessao();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["publico", "home"],
    queryFn: () => publicoService.home(),
    staleTime: 60_000,
  });

  const vagasDestaque = data?.vagasDestaque ?? [];
  const empresasParceiras = data?.empresasParceiras ?? [];

  // O `head` da rota é estático (roda fora do React), então o título da aba ficava em português mesmo
  // com o site em outro idioma. É a primeira coisa que um leitor de tela anuncia ao abrir a página.
  useEffect(() => {
    document.title = t("inicio.tituloDaAba");
  }, [t]);

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
        {t("inicio.pularParaConteudo")}
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4">
          <Link to="/" aria-label={t("inicio.paginaInicial")} className="min-w-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {/*
              O seletor de idioma precisa estar na primeira tela: quem não lê português chega aqui antes
              de qualquer outra página, e até agora só encontrava a troca de idioma depois de entrar.
              Em tela estreita ele sai do cabeçalho (não cabe com "Entrar" e t("cabecalho.criarConta")) e aparece no
              rodapé, que é onde esse controle costuma estar.
            */}
            <SeletorDeIdioma className="hidden lg:flex" />
            <Button
              asChild
              variant="ghost"
              className="min-h-11 gap-1.5"
              aria-label={t("inicio.configAcessibilidade")}
            >
              <Link to="/configuracoes/acessibilidade">
                <Accessibility aria-hidden="true" />
                <span className="hidden sm:inline">{t("inicio.acessibilidade")}</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
              <Link to="/sobre-nos">{t("inicio.sobreNos")}</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/entrar">{t("inicio.entrar")}</Link>
            </Button>
            <Button asChild className="min-h-11">
              <Link to="/cadastro">{t("inicio.criarConta")}</Link>
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
              <Sparkles className="size-3.5" aria-hidden="true" /> {t("inicio.selo")}
            </Badge>
            {/* O título é uma frase só, partida em três para as duas últimas palavras terem cor. A ordem
                serve aos três idiomas: as palavras destacadas ficam no fim da frase em todos eles. */}
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {t("inicio.tituloInicio")}
              <span className="text-primary">{t("inicio.tituloDestaque1")}</span>{" "}
              <span className="text-destructive">{t("inicio.tituloDestaque2")}</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("inicio.subtitulo")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-12 text-base">
                <Link to="/cadastro">
                  {t("inicio.queroVagas")} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 text-base">
                {/* A conta de empresa nasce de uma conta de candidato, então o caminho começa lá. */}
                <Link to="/cadastro/candidato" search={{ depois: "empresa" }}>
                  <Building2 aria-hidden="true" /> {t("inicio.souEmpresa")}
                </Link>
              </Button>
            </div>
          </div>

          <Card className="relative z-10 overflow-hidden border-border shadow-card">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("inicio.recursosAtivos")}
              </p>
              <ul className="space-y-3">
                {RECURSOS_ATIVOS.map((item) => (
                  <li key={item.chave} className="flex items-start gap-3 rounded-xl bg-secondary p-3">
                    <span
                      aria-hidden="true"
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.classeCor}`}
                    >
                      <item.icon className="size-5" />
                    </span>
                    <span className="min-w-0 text-sm font-medium">{t(item.chave)}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="min-h-11 w-full bg-foreground text-background hover:bg-foreground/90">
                <Link to="/configuracoes/acessibilidade">
                  {t("inicio.configurarAgora")} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          </section>
        </div>

        <section aria-labelledby="recursos" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="recursos" className="text-3xl font-extrabold">
              {t("inicio.recursosTitulo")}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{t("inicio.recursosDescricao")}</p>
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
                      <h3 className="text-base font-bold">{t(r.titulo)}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t(r.texto)}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="vagas-destaque" className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <h2 id="vagas-destaque" className="text-3xl font-extrabold">
                {t("inicio.vagasTitulo")}
              </h2>
              <p className="mt-2 text-muted-foreground">{t("inicio.vagasDescricao")}</p>
            </div>
            <Button asChild variant="ghost" className="min-h-11 shrink-0">
              <Link to="/vagas">
                {t("inicio.verTodas")} <ArrowRight aria-hidden="true" />
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
            <p className="mt-8 text-muted-foreground">{t("inicio.vagasErro")}</p>
          ) : vagasDestaque.length === 0 ? (
            <p className="mt-8 text-muted-foreground">{t("inicio.vagasVazio")}</p>
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
                {t("inicio.parceirasTitulo")}
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
                <h2 className="text-3xl font-extrabold">{t("inicio.chamadaTitulo")}</h2>
                <p className="mt-2 text-primary-foreground">{t("inicio.chamadaTexto")}</p>
              </div>
              <Button asChild size="lg" variant="secondary" className="min-h-12 shrink-0 text-base">
                <Link to="/cadastro">
                  <Users aria-hidden="true" /> {t("inicio.criarMinhaConta")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Logo />
          <nav aria-label={t("inicio.rodape")} className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <Link to="/sobre-nos" className="hover:underline">
              {t("inicio.sobreNos")}
            </Link>
            <Link to="/termos" className="hover:underline">
              {t("inicio.termos")}
            </Link>
            <Link to="/privacidade" className="hover:underline">
              {t("inicio.privacidade")}
            </Link>
            <Link to="/fale-conosco" className="hover:underline">
              {t("inicio.faleConosco")}
            </Link>
          </nav>
        </div>
        <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-sm text-muted-foreground">{t("inicio.assinatura")}</p>
          {/* Em tela larga o seletor já está no cabeçalho; aqui ele serve o celular, onde não cabia lá. */}
          <SeletorDeIdioma className="lg:hidden" />
        </div>
      </footer>
    </div>
  );
}
