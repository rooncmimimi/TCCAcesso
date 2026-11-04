import { Search } from "lucide-react";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ICONE_RECURSO_ACESSIBILIDADE,
  PUBLICO_ALVO,
  RECURSOS_ACESSIBILIDADE,
} from "@/components/dashboard/constantesVaga";
import type { PublicoAlvoVaga, RecursoAcessibilidadeVaga } from "@/types";

export interface FiltrosVagasEstado {
  busca: string;
  modalidade: string;
  cidade: string;
  publicoAlvo: PublicoAlvoVaga | "";
  recursosAcessibilidade: RecursoAcessibilidadeVaga[];
}

const MODALIDADES = ["presencial", "hibrido", "remoto"] as const;

/** Formulário de busca e filtros da listagem pública de vagas. */
export function FiltrosVagas({
  valor,
  aoMudar,
  aoBuscar,
}: {
  valor: FiltrosVagasEstado;
  aoMudar: (proximo: FiltrosVagasEstado) => void;
  aoBuscar: () => void;
}) {
  const { t } = useIdioma();

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-4">
        <div>
          <Label htmlFor="busca-vagas" className="text-sm font-bold">
            {t("filtro.buscarVaga")}
          </Label>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="busca-vagas"
              className="min-h-12"
              placeholder={t("filtro.placeholderBusca")}
              value={valor.busca}
              onChange={(e) => aoMudar({ ...valor, busca: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") aoBuscar();
              }}
            />
            <Button className="min-h-12 shrink-0" aria-label={t("filtro.buscarRotulo")} onClick={aoBuscar}>
              <Search aria-hidden="true" />
              <span className="hidden sm:inline">{t("filtro.buscar")}</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="filtro-cidade" className="text-sm font-bold">
              {t("filtro.cidade")}
            </Label>
            <CidadeAutocomplete
              id="filtro-cidade"
              className="mt-2 min-h-11"
              placeholder={t("filtro.cidadeExemplo")}
              value={valor.cidade}
              onChange={(cidade) => aoMudar({ ...valor, cidade })}
              onEnterSemSelecao={aoBuscar}
            />
          </div>

          <div>
            <Label htmlFor="filtro-modalidade" className="text-sm font-bold">
              {t("filtro.modalidade")}
            </Label>
            <Select
              value={valor.modalidade || "todas"}
              onValueChange={(v) => aoMudar({ ...valor, modalidade: v === "todas" ? "" : v })}
            >
              <SelectTrigger id="filtro-modalidade" className="mt-2 min-h-11">
                <SelectValue placeholder={t("filtro.todas")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">{t("filtro.todasModalidades")}</SelectItem>
                {MODALIDADES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`vaga.modalidade.${m}` as ChaveBase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            {/* Único controle de público: "exclusiva PCD" já é uma das opções da lista (junto
                de 50+ e PCD+50+), então não há checkbox separado. */}
            <Label htmlFor="filtro-publico" className="text-sm font-bold">
              {t("filtro.publico")}
            </Label>
            <Select
              value={valor.publicoAlvo || "todos"}
              onValueChange={(v) =>
                aoMudar({ ...valor, publicoAlvo: v === "todos" ? "" : (v as PublicoAlvoVaga) })
              }
            >
              <SelectTrigger id="filtro-publico" className="mt-2 min-h-11">
                <SelectValue placeholder={t("filtro.todosPublicos")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t("filtro.todosPublicos")}</SelectItem>
                {PUBLICO_ALVO.map((p) => (
                  <SelectItem key={p} value={p}>
                    {t(`vaga.publico.${p}` as ChaveBase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-bold">{t("filtro.recursos")}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS_ACESSIBILIDADE.filter((r) => r !== "outro").map((recurso) => {
              const Icone = ICONE_RECURSO_ACESSIBILIDADE[recurso];
              const marcado = valor.recursosAcessibilidade.includes(recurso);
              return (
                <label
                  key={recurso}
                  className="flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                >
                  <Checkbox
                    checked={marcado}
                    onCheckedChange={(c) => {
                      const proximos = c
                        ? [...valor.recursosAcessibilidade, recurso]
                        : valor.recursosAcessibilidade.filter((r) => r !== recurso);
                      aoMudar({ ...valor, recursosAcessibilidade: proximos });
                    }}
                  />
                  <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate">{t(`vaga.recurso.${recurso}` as ChaveBase)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
