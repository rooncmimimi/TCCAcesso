import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
} from "@tanstack/react-router";

import { AcessibilidadeProvider } from "@/contexts/AcessibilidadeProvider";
import { VozProvider } from "@/contexts/VozProvider";
import { LeituraDestacadaProvider } from "@/contexts/LeituraDestacadaProvider";
import { ControleDeLeitura } from "@/components/acessibilidade/ControleDeLeitura";
import { FerramentasDeLeitura } from "@/components/acessibilidade/FerramentasDeLeitura";
import { ReguaDeLeitura } from "@/components/acessibilidade/ReguaDeLeitura";
import { useCursorDeLeitura } from "@/hooks/useCursorDeLeitura";
import { useLeituraAutomatica } from "@/hooks/useLeituraAutomatica";
import { useIdioma } from "@/hooks/useIdioma";
import { SessaoProvider } from "@/contexts/SessaoProvider";
import { IdiomaProvider } from "@/contexts/IdiomaProvider";
import { VLibras } from "@/components/VLibras";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  const { t } = useIdioma();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("raiz.naoEncontradaTitulo")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("raiz.naoEncontradaTexto")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("raiz.voltarInicio")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useIdioma();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("raiz.erroTitulo")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("raiz.erroTexto")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("raiz.tentarNovamente")}
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("raiz.irInicio")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "ACESSO — Inclusão profissional para PCD e 50+" },
      {
        name: "description",
        content:
          "Rede profissional acessível que conecta pessoas com deficiência e profissionais 50+ a empresas com vagas realmente inclusivas.",
      },
      { property: "og:title", content: "ACESSO — Inclusão profissional para PCD e 50+" },
      {
        property: "og:description",
        content: "Vagas inclusivas, comunidade e acessibilidade de verdade em cada tela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComponenteRaiz,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function AppFrame() {
  useLeituraAutomatica();
  useCursorDeLeitura();

  return (
    <>
      <HeadContent />
      <Outlet />
      <VLibras />
      <FerramentasDeLeitura />
      <ControleDeLeitura />
      <ReguaDeLeitura />
      <Toaster />
    </>
  );
}

function ComponenteRaiz() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AcessibilidadeProvider>
        <VozProvider>
          <LeituraDestacadaProvider>
            <SessaoProvider>
              <IdiomaProvider>
                <AppFrame />
              </IdiomaProvider>
            </SessaoProvider>
          </LeituraDestacadaProvider>
        </VozProvider>
      </AcessibilidadeProvider>
    </QueryClientProvider>
  );
}
