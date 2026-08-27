import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FiltrosVagasState {
  busca: string;
  modalidade: string;
  cidade: string;
  exclusivaPcd: boolean;
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
            <Input
              id="filtro-cidade"
              className="mt-2 min-h-11"
              placeholder="Ex.: São Paulo"
              value={valor.cidade}
              onChange={(e) => aoMudar({ ...valor, cidade: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") aoBuscar();
              }}
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

          <div className="flex items-end pb-1">
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={valor.exclusivaPcd}
                onCheckedChange={(c) => aoMudar({ ...valor, exclusivaPcd: Boolean(c) })}
              />
              Somente vagas exclusivas PCD
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
