import { createFileRoute } from "@tanstack/react-router";
import { useIdioma } from "@/hooks/useIdioma";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Loader2 } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosVagas, type FiltrosVagasEstado } from "@/components/vagas/FiltrosVagas";
import { VagaCard } from "@/components/vagas/VagaCard";
import { useSessao } from "@/hooks/useSessao";
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
  // `?q=` preenche a busca (usado pelo comando de voz e pelo dicionário de profissões).
  validateSearch: (busca: Record<string, unknown>): { q?: string } => ({ q: typeof busca.q === "string" && busca.q.trim() ? busca.q.trim().slice(0, 80) : undefined }),
  component: Vagas,
});

const FILTROS_INICIAIS: FiltrosVagasEstado = {
  busca: "",
  modalidade: "",
  cidade: "",
  publicoAlvo: "",
  recursosAcessibilidade: [],
};

function Vagas() {
  const { usuario } = useSessao();
  const { t } = useIdioma();
  const queryClient = useQueryClient();
  const { q: buscaDaUrl } = Route.useSearch();
  const [rascunho, setRascunho] = useState<FiltrosVagasEstado>({ ...FILTROS_INICIAIS, busca: buscaDaUrl ?? "" });
  const [filtros, setFiltros] = useState<FiltrosVagasEstado>({ ...FILTROS_INICIAIS, busca: buscaDaUrl ?? "" });
  const [pagina, setPagina] = useState(1);

  // Uma nova busca pela URL (por exemplo, por voz estando já nesta página) substitui o termo.
  useEffect(() => {
    if (buscaDaUrl === undefined) return;

    setRascunho((atual) => ({ ...atual, busca: buscaDaUrl }));
    setFiltros((atual) => ({ ...atual, busca: buscaDaUrl }));
    setPagina(1);
  }, [buscaDaUrl]);

  const ehCandidato = usuario?.tipo === "candidato";

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
      toast.success(resultado.favoritada ? t("vagas.favoritada") : t("vagas.favoritadaRemovida"));
      // Há duas chaves de query para favoritos: `["dashboard", "favoritos"]` (esta tela e o detalhe
      // da vaga, lista simples) e `["vagas-favoritas", pagina]` (widget do painel, paginado). São
      // buscas diferentes do mesmo dado, então as duas são invalidadas, em vez de unificadas com
      // risco de quebrar a paginação do widget; o prefixo sem `pagina` cobre qualquer página em
      // cache. `metricas-candidato` também conta favoritos (card "Vagas favoritas" do painel) e
      // entra junto.
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
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("vagas.titulo")}</h1>
      <p className="mt-2 text-muted-foreground" role="status" aria-live="polite">
        {isLoading
          ? t("vagas.carregando")
          : t("vagas.total", { n: data?.total ?? 0 })}
      </p>

      <div className="mt-6">
        <FiltrosVagas valor={rascunho} aoMudar={setRascunho} aoBuscar={buscar} />
      </div>

      {isLoading && (
        <ul className="mt-6 space-y-4" aria-label={t("vagas.carregandoLista")}>
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Skeleton className="h-44 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <div role="alert" className="mt-6 space-y-3 rounded-xl border border-destructive/40 p-6">
          <p className="text-sm">{t("vagas.erro")}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("vagas.tentarNovamente")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && vagas.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border p-10 text-center text-muted-foreground">
          <Briefcase className="size-8" aria-hidden="true" />
          <p className="text-sm">{t("vagas.nenhuma")}</p>
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
                    toast.info(t("vagas.entreFavoritar"));
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
            {t("vagas.paginaAnterior")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("vagas.paginaDe", { pagina: data?.pagina ?? 1, total: data?.totalPaginas ?? 1 })}
            {isFetching && <Loader2 className="ml-2 inline size-4 animate-spin" aria-hidden="true" />}
          </p>
          <Button
            variant="outline"
            disabled={pagina >= (data?.totalPaginas ?? 1)}
            onClick={() => setPagina((p) => p + 1)}
          >
            {t("vagas.proximaPagina")}
          </Button>
        </div>
      )}
    </EstruturaApp>
  );
}
