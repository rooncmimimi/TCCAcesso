import type { LucideIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

/** Chaves das preferências que são liga/desliga. */
export type ToggleKey = {
  [K in keyof PreferenciasAcessibilidade]: PreferenciasAcessibilidade[K] extends boolean ? K : never;
}[keyof PreferenciasAcessibilidade];

const CAIXA_DO_ICONE = "grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary";

export function ToggleRow({
  id,
  icon: Icon,
  titulo,
  descricao,
  chave,
  desabilitado = false,
}: {
  id: string;
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  chave: ToggleKey;
  desabilitado?: boolean;
}) {
  const { preferencias, definir } = useAcessibilidade();
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span aria-hidden="true" className={CAIXA_DO_ICONE}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-bold">
          {titulo}
        </Label>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      <Switch
        id={id}
        checked={preferencias[chave]}
        disabled={desabilitado}
        onCheckedChange={(v) => definir(chave, v)}
        aria-describedby={`${id}-desc`}
      />
      <span id={`${id}-desc`} className="sr-only">
        {descricao}
      </span>
    </div>
  );
}

export function SliderRow({
  id,
  icon: Icon,
  titulo,
  valorTexto,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  icon: LucideIcon;
  titulo: string;
  valorTexto: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span aria-hidden="true" className={CAIXA_DO_ICONE}>
          <Icon className="size-5" />
        </span>
        <Label htmlFor={id} className="min-w-0 text-sm font-bold">
          {titulo}
        </Label>
        <output htmlFor={id} className="text-sm font-semibold tabular-nums text-primary">
          {valorTexto}
        </output>
      </div>
      <Slider
        id={id}
        className="mt-4"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        aria-label={titulo}
      />
    </div>
  );
}

/** Escolha entre poucas opções, com `<select>` nativo: funciona com teclado, leitor de tela e celular. */
export function SelectRow<V extends string>({
  id,
  icon: Icon,
  titulo,
  valor,
  opcoes,
  onChange,
}: {
  id: string;
  icon: LucideIcon;
  titulo: string;
  valor: V;
  /** O rotulo e a CHAVE do dicionario: o proprio SelectRow traduz. Tipado, o compilador cobra.
   * Antes era `string` e o render mostrava a chave crua na tela. */
  opcoes: ReadonlyArray<{ valor: V; rotulo: ChaveBase }>;
  onChange: (v: V) => void;
}) {
  const { t } = useIdioma();

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,14rem)]">
      <span aria-hidden="true" className={CAIXA_DO_ICONE}>
        <Icon className="size-5" />
      </span>
      <Label htmlFor={id} className="min-w-0 text-sm font-bold">
        {titulo}
      </Label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value as V)}
        className="col-span-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm sm:col-span-1"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {t(o.rotulo)}
          </option>
        ))}
      </select>
    </div>
  );
}
