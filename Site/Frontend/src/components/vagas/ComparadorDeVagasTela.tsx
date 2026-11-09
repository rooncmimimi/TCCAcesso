import { Fragment, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import { LIMITE_DE_VAGAS, compararVagas, contarDiferencas } from "@/lib/comparadorDeVagas";
import { assinarComparacao, fotoDaComparacao, limparComparacao, removerDaComparacao } from "@/lib/listaDeComparacao";
import { ambienteService } from "@/services/ambiente.service";
import vagasService from "@/services/vagas.service";
import type { Vaga } from "@/types";

/**
 * Tela de comparação de vagas, lado a lado. Não dá nota, não ordena e não diz qual vaga é "melhor" ou
 * "adequada": a pessoa decide com as próprias necessidades. As linhas em que as vagas diferem ganham
 * o TEXTO "Diferente", além da cor, para quem não distingue cores.
 */
export function ComparadorDeVagasTela() {
  const { t } = useIdioma();
  const foto = useSyncExternalStore(assinarComparacao, fotoDaComparacao, () => "");
  const ids = foto ? foto.split(",") : [];

  const consultas = useQueries({ queries: ids.map((id) => ({ queryKey: ["vaga", id], queryFn: () => vagasService.detalhar(id) })) });
  const { data: catalogo } = useQuery({ queryKey: ["vagas", "catalogo-acessibilidade"], queryFn: () => ambienteService.catalogo(), staleTime: 60 * 60 * 1000 });

  if (ids.length === 0) {
    return (
      <div className="mt-6 space-y-3 rounded-xl border border-border p-6">
        <p>{t("vagas.comparadorDeVagasTela.voceAindaNaoEscolheuVagasPara")}</p>
        <p className="text-sm text-muted-foreground">Abra uma vaga e use o botão “Comparar esta vaga”. Você pode comparar até {LIMITE_DE_VAGAS} vagas.</p>
        <Button asChild className="min-h-11">
          <Link to="/vagas">Ver as vagas</Link>
        </Button>
      </div>
    );
  }

  const carregando = consultas.some((c) => c.isLoading);
  const vagas = consultas.map((c) => c.data).filter((v): v is Vaga => Boolean(v));
  const falhas = consultas.filter((c) => c.isError).length;

  if (carregando) {
    return (
      <p role="status" className="mt-6 text-sm text-muted-foreground">
        {t("vagas.comparadorDeVagasTela.carregandoAsVagas")}
      </p>
    );
  }

  const linhas = compararVagas(vagas, catalogo, (chave) => t(`vaga.recurso.${chave}` as ChaveBase));
  const diferencas = contarDiferencas(linhas);
  const grupos = [...new Set(linhas.map((l) => l.grupo))];
  const nomeDe = (v: Vaga) => v.empresa?.nomeFantasia ?? v.empresa?.razaoSocial ?? "Empresa";

  return (
    <div className="mt-6 space-y-4">
      {falhas > 0 ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {falhas === 1 ? "Uma vaga não pôde ser carregada e ficou fora da tabela." : `${falhas} vagas não puderam ser carregadas e ficaram fora da tabela.`}
        </p>
      ) : null}

      <p role="status" className="text-sm">
        {vagas.length < 2 ? "Escolha pelo menos mais uma vaga para ver as diferenças." : diferencas === 0 ? "Nenhuma diferença nos itens comparados." : `${diferencas} ${diferencas === 1 ? "item diferente" : "itens diferentes"} entre as vagas.`}
      </p>
      <p className="text-xs text-muted-foreground">{t("vagas.comparadorDeVagasTela.istoESoUmaComparacaoDoQueCada")}</p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <caption className="sr-only">{t("vagas.comparadorDeVagasTela.comparacaoDasVagasEscolhidas")}</caption>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th scope="col" className="p-3 font-semibold">
                Item
              </th>
              {vagas.map((v) => (
                <th key={v.id} scope="col" className="min-w-40 p-3 align-top font-semibold">
                  <Link to="/vaga/$vagaId" params={{ vagaId: v.id }} className="text-primary underline">
                    {v.titulo}
                  </Link>
                  <span className="block text-xs font-normal text-muted-foreground">{nomeDe(v)}</span>
                  <Button type="button" variant="ghost" size="sm" className="mt-1 min-h-11 px-2" onClick={() => removerDaComparacao(v.id)} aria-label={`Tirar “${v.titulo}” da comparação`}>
                    Tirar
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          {grupos.map((grupo) => (
            <Fragment key={grupo}>
              <tbody>
                <tr>
                  <th scope="colgroup" colSpan={vagas.length + 1} className="bg-muted/30 p-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {grupo}
                  </th>
                </tr>
                {linhas
                  .filter((l) => l.grupo === grupo)
                  .map((l) => (
                    <tr key={l.id} className={l.diferem ? "border-t border-border bg-accent/40" : "border-t border-border"}>
                      <th scope="row" className="p-3 align-top font-medium">
                        {l.rotulo}
                        {l.diferem ? <span className="mt-1 block text-xs font-bold text-primary">{t("vagas.comparadorDeVagasTela.diferente")}</span> : null}
                      </th>
                      {l.valores.map((valor, i) => (
                        <td key={vagas[i].id} className="p-3 align-top">
                          {valor}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </Fragment>
          ))}
        </table>
      </div>

      <Button type="button" variant="outline" className="min-h-11" onClick={limparComparacao}>
        {t("vagas.comparadorDeVagasTela.limparAComparacao")}
      </Button>
    </div>
  );
}
