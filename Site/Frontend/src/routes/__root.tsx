import { useEffect, useRef } from "react";
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
import { useLeituraAutomatica } from "@/hooks/useLeituraAutomatica";
import { SessaoProvider } from "@/contexts/SessaoProvider";
import { VLibras } from "@/components/VLibras";
import { Toaster } from "@/components/ui/sonner";
import { dic, metaPagina, useIdioma, useT } from "@/i18n";

function NotFoundComponent() {
  const t = useT().erros.naoEncontrada;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t.titulo}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.texto}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.voltar}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT().erros.falhaDePagina;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t.titulo}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.texto}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.tentar}
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t.inicio}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      ...metaPagina(dic().layout.meta).meta,
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

  // Os títulos de página (`head` das rotas) são calculados no idioma de quando a rota carregou. Ao
  // trocar de idioma o roteador é invalidado para recalculá-los. Não roda na primeira montagem: ali
  // o idioma ainda é o mesmo e invalidar só repetiria o carregamento da rota.
  const router = useRouter();
  const { idioma } = useIdioma();
  const idiomaAnterior = useRef(idioma);
  useEffect(() => {
    if (idiomaAnterior.current === idioma) return;
    idiomaAnterior.current = idioma;
    void router.invalidate();
  }, [idioma, router]);

  return (
    <>
      <HeadContent />
      <Outlet />
      <VLibras />
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
          <SessaoProvider>
            <AppFrame />
          </SessaoProvider>
        </VozProvider>
      </AcessibilidadeProvider>
    </QueryClientProvider>
  );
}
