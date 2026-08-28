import { Search } from "lucide-react";
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
  ROTULO_PUBLICO_ALVO,
  ROTULO_RECURSO_ACESSIBILIDADE,
} from "@/components/dashboard/constantesVaga";
import type { PublicoAlvoVaga, RecursoAcessibilidadeVaga } from "@/types";

export interface FiltrosVagasState {
  busca: string;
  modalidade: string;
  cidade: string;
  publicoAlvo: PublicoAlvoVaga | "";
  recursosAcessibilidade: RecursoAcessibilidadeVaga[];
}

const MODALIDADES = ["Presencial", "Hibrido", "Remoto"] as const;

/** Formulário de busca e filtros da listagem pública de vagas. */
export function FiltrosVagas({
  valor,
  aoMudar,
  aoBuscar,
}: {
  valor: FiltrosVagasState;
  aoMudar: (proximo: FiltrosVagasState) => void;
  aoBuscar: () => void;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-4">
        <div>
          <Label htmlFor="busca-vagas" className="text-sm font-bold">
            Buscar vaga
          </Label>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="busca-vagas"
              className="min-h-12"
              placeholder="Cargo, empresa ou palavra-chave"
              value={valor.busca}
              onChange={(e) => aoMudar({ ...valor, busca: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") aoBuscar();
              }}
            />
            <Button className="min-h-12 shrink-0" aria-label="Buscar vagas" onClick={aoBuscar}>
              <Search aria-hidden="true" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="filtro-cidade" className="text-sm font-bold">
              Cidade
            </Label>
            <CidadeAutocomplete
              id="filtro-cidade"
              className="mt-2 min-h-11"
              placeholder="Ex.: São Paulo"
              value={valor.cidade}
              onChange={(cidade) => aoMudar({ ...valor, cidade })}
              onEnterSemSelecao={aoBuscar}
            />
          </div>

          <div>
            <Label htmlFor="filtro-modalidade" className="text-sm font-bold">
              Modalidade
            </Label>
            <Select
              value={valor.modalidade || "todas"}
              onValueChange={(v) => aoMudar({ ...valor, modalidade: v === "todas" ? "" : v })}
            >
              <SelectTrigger id="filtro-modalidade" className="mt-2 min-h-11">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as modalidades</SelectItem>
                {MODALIDADES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            {/* Único controle de público — "exclusiva PCD" já é uma das
                opções desta lista (junto de 50+ e PCD+50+), então não
                existe mais um checkbox separado e sobreposto para isso. */}
            <Label htmlFor="filtro-publico" className="text-sm font-bold">
              Público da vaga
            </Label>
            <Select
              value={valor.publicoAlvo || "todos"}
              onValueChange={(v) =>
                aoMudar({ ...valor, publicoAlvo: v === "todos" ? "" : (v as PublicoAlvoVaga) })
              }
            >
              <SelectTrigger id="filtro-publico" className="mt-2 min-h-11">
                <SelectValue placeholder="Todos os públicos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os públicos</SelectItem>
                {PUBLICO_ALVO.map((p) => (
                  <SelectItem key={p} value={p}>
                    {ROTULO_PUBLICO_ALVO[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-bold">Recursos de acessibilidade da vaga</legend>
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
                  <span className="min-w-0 truncate">{ROTULO_RECURSO_ACESSIBILIDADE[recurso]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
