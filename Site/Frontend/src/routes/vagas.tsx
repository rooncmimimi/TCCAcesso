import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Briefcase, Loader2 } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosVagas, type FiltrosVagasState } from "@/components/vagas/FiltrosVagas";
import { VagaCard } from "@/components/vagas/VagaCard";
import { useSession } from "@/contexts/SessionContext";
import vagasService from "@/services/vagas.service";
import dashboardService from "@/services/dashboard.service";
import { extrairMensagemErro } from "@/services/api";

export const Route = createFileRoute("/vagas")({
  head: () => ({
    meta: [
      { title: "Vagas inclusivas — ACESSO" },
      {
        name: "description",
        content:
          "Busque vagas com recursos de acessibilidade declarados por empresas verificadas na plataforma ACESSO.",
      },
      { property: "og:title", content: "Vagas inclusivas — ACESSO" },
      { property: "og:description", content: "Oportunidades para PCD e profissionais 50+." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Vagas,
});

const FILTROS_INICIAIS: FiltrosVagasState = {
  busca: "",
  modalidade: "",
  cidade: "",
  publicoAlvo: "",
  recursosAcessibilidade: [],
};

function Vagas() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [rascunho, setRascunho] = useState<FiltrosVagasState>(FILTROS_INICIAIS);
  const [filtros, setFiltros] = useState<FiltrosVagasState>(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);

  const ehCandidato = user?.tipo === "candidato";

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["vagas", filtros, pagina],
    queryFn: () =>
      vagasService.listar({
        page: pagina,
        limit: 10,
        q: filtros.busca || undefined,
        cidade: filtros.cidade || undefined,
        modalidade: filtros.modalidade || undefined,
        publicoAlvo: filtros.publicoAlvo || undefined,
        recursosAcessibilidade: filtros.recursosAcessibilidade.length
          ? filtros.recursosAcessibilidade
          : undefined,
      }),
  });

  const { data: favoritos } = useQuery({
    queryKey: ["dashboard", "favoritos"],
    queryFn: () => dashboardService.favoritos({ limit: 100 }),
    enabled: ehCandidato,
  });

  const idsFavoritos = new Set((favoritos?.dados ?? []).map((vaga) => vaga.id));

  const favoritar = useMutation({
    mutationFn: (vagaId: string) => vagasService.favoritar(vagaId),
    onSuccess: (resultado) => {
      toast.success(resultado.favoritada ? "Vaga favoritada." : "Vaga removida dos favoritos.");
      // Fase 9, Bloco 6: existem DUAS queryKeys para favoritos —
      // `["dashboard","favoritos"]` (esta tela e o detalhe da vaga, lista
      // "achatada") e `["vagas-favoritas", pagina]` (widget do painel,
      // paginado). São formas de busca genuinamente diferentes para o
      // mesmo dado, então em vez de unificar (arriscar regressão na
      // paginação do widget) invalidamos as duas — o prefixo sem `pagina`
      // cobre qualquer página já cacheada do widget sem forçá-la de volta
      // à página 1. `metricas-candidato` também conta favoritos (card
      // "Vagas favoritas" do painel), por isso entra aqui também.
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "favoritos"] });
      void queryClient.invalidateQueries({ queryKey: ["vagas-favoritas"] });
      void queryClient.invalidateQueries({ queryKey: ["metricas-candidato"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const vagas = data?.vagas ?? [];

  function buscar() {
    setPagina(1);
    setFiltros(rascunho);
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Vagas inclusivas</h1>
      <p className="mt-2 text-muted-foreground" role="status" aria-live="polite">
        {isLoading
          ? "Carregando oportunidades…"
          : `${data?.total ?? 0} oportunidade${(data?.total ?? 0) === 1 ? "" : "s"} publicada${
              (data?.total ?? 0) === 1 ? "" : "s"
            }.`}
      </p>

      <div className="mt-6">
        <FiltrosVagas valor={rascunho} aoMudar={setRascunho} aoBuscar={buscar} />
      </div>

      {isLoading && (
        <ul className="mt-6 space-y-4" aria-label="Carregando vagas">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Skeleton className="h-44 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <div role="alert" className="mt-6 space-y-3 rounded-xl border border-destructive/40 p-6">
          <p className="text-sm">Não foi possível carregar as vagas.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && vagas.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border p-10 text-center text-muted-foreground">
          <Briefcase className="size-8" aria-hidden="true" />
          <p className="text-sm">Nenhuma vaga encontrada com esses filtros.</p>
        </div>
      )}

      {vagas.length > 0 && (
        <ul className="mt-6 space-y-4">
          {vagas.map((vaga) => (
            <li key={vaga.id}>
              <VagaCard
                vaga={vaga}
                favoritada={idsFavoritos.has(vaga.id)}
                favoritando={favoritar.isPending && favoritar.variables === vaga.id}
                onFavoritar={() => {
                  if (!ehCandidato) {
                    toast.info("Entre com uma conta de candidato para favoritar vagas.");
                    return;
                  }
                  favoritar.mutate(vaga.id);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {(data?.totalPaginas ?? 1) > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Página anterior
          </Button>
          <p className="text-sm text-muted-foreground">
            Página {data?.pagina} de {data?.totalPaginas}
            {isFetching && <Loader2 className="ml-2 inline size-4 animate-spin" aria-hidden="true" />}
          </p>
          <Button
            variant="outline"
            disabled={pagina >= (data?.totalPaginas ?? 1)}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima página
          </Button>
        </div>
      )}
    </AppShell>
  );
}
