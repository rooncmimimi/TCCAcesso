import {
  Contrast,
  Eye,
  Keyboard,
  Languages,
  MousePointer2,
  Moon,
  Sparkles,
  Type,
  Volume2,
  Waves,
  AlignVerticalSpaceAround,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAccessibility, type AccessibilityPrefs } from "@/lib/accessibility";
import { useSpeech } from "@/lib/speech";

type ToggleKey = {
  [K in keyof AccessibilityPrefs]: AccessibilityPrefs[K] extends boolean ? K : never;
}[keyof AccessibilityPrefs];

function ToggleRow({
  id,
  icon: Icon,
  titulo,
  descricao,
  chave,
}: {
  id: string;
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  chave: ToggleKey;
}) {
  const { prefs, set } = useAccessibility();
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
      >
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
        checked={prefs[chave]}
        onCheckedChange={(v) => set(chave, v)}
        aria-describedby={`${id}-desc`}
      />
      <span id={`${id}-desc`} className="sr-only">
        {descricao}
      </span>
    </div>
  );
}

function SliderRow({
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
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
        >
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

/** Amostra que reage imediatamente às preferências escolhidas. */
export function AccessibilityPreview() {
  const { speak } = useSpeech();
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="space-y-3 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Pré-visualização em tempo real
        </p>
        <h3 className="text-lg font-extrabold">Assistente Administrativo Jr — Vaga PCD</h3>
        <p className="text-sm text-muted-foreground">
          Grupo Aurora · Híbrido · São Paulo, SP. Ambiente acessível, com intérprete de Libras e
          suporte a leitor de tela.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            onClick={() =>
              speak(
                "Exemplo de leitura por voz do ACESSO. Assistente Administrativo Júnior, vaga inclusiva no Grupo Aurora.",
              )
            }
          >
            Testar leitura em voz alta
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-input px-4 text-sm font-semibold"
          >
            Botão de exemplo (teste o foco com Tab)
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AccessibilityPanel() {
  const { prefs, set } = useAccessibility();

  return (
    <div className="space-y-6">
      <AccessibilityPreview />

      <section aria-labelledby="grupo-visual" className="space-y-3">
        <h3 id="grupo-visual" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Visual
        </h3>
        <ToggleRow
          id="a11y-contrast"
          icon={Contrast}
          titulo="Alto contraste"
          descricao="Aumenta o contraste entre textos, bordas e fundos."
          chave="highContrast"
        />
        <ToggleRow
          id="a11y-dark"
          icon={Moon}
          titulo="Modo escuro"
          descricao="Reduz o brilho da tela em ambientes com pouca luz."
          chave="darkMode"
        />
        <ToggleRow
          id="a11y-dyslexia"
          icon={Type}
          titulo="Fonte para dislexia"
          descricao="Tipografia com letras mais distinguíveis entre si."
          chave="dyslexiaFont"
        />
        <SliderRow
          id="a11y-font"
          icon={Type}
          titulo="Tamanho da fonte"
          valorTexto={`${Math.round(prefs.fontScale * 100)}%`}
          min={0.875}
          max={1.6}
          step={0.025}
          value={prefs.fontScale}
          onChange={(v) => set("fontScale", v)}
        />
        <SliderRow
          id="a11y-letter"
          icon={Waves}
          titulo="Espaçamento entre letras"
          valorTexto={`${prefs.letterSpacing.toFixed(3)} em`}
          min={0}
          max={0.16}
          step={0.005}
          value={prefs.letterSpacing}
          onChange={(v) => set("letterSpacing", v)}
        />
        <SliderRow
          id="a11y-line"
          icon={AlignVerticalSpaceAround}
          titulo="Espaçamento entre linhas"
          valorTexto={prefs.lineHeight.toFixed(2)}
          min={1.3}
          max={2.4}
          step={0.05}
          value={prefs.lineHeight}
          onChange={(v) => set("lineHeight", v)}
        />
      </section>

      <section aria-labelledby="grupo-navegacao" className="space-y-3">
        <h3
          id="grupo-navegacao"
          className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
        >
          Navegação e interação
        </h3>
        <ToggleRow
          id="a11y-cursor"
          icon={MousePointer2}
          titulo="Cursor ampliado"
          descricao="Ponteiro do mouse maior e com contorno reforçado."
          chave="bigCursor"
        />
        <ToggleRow
          id="a11y-motion"
          icon={Sparkles}
          titulo="Reduzir animações"
          descricao="Remove transições e movimentos que podem causar desconforto."
          chave="reduceMotion"
        />
        <ToggleRow
          id="a11y-focus"
          icon={Target}
          titulo="Destaque de foco do teclado"
          descricao="Contorno bem visível no elemento em foco."
          chave="focusHighlight"
        />
        <ToggleRow
          id="a11y-keyboard"
          icon={Keyboard}
          titulo="Navegação por teclado"
          descricao="Atalhos e ordem de tabulação otimizados para uso sem mouse."
          chave="keyboardNav"
        />
      </section>

      <section aria-labelledby="grupo-assistivo" className="space-y-3">
        <h3
          id="grupo-assistivo"
          className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
        >
          Recursos assistivos
        </h3>
        <ToggleRow
          id="a11y-voice"
          icon={Volume2}
          titulo="Leitura por voz"
          descricao="Lê em voz alta os elementos ao navegar pelo site."
          chave="screenReader"
        />
        <SliderRow
          id="a11y-rate"
          icon={Eye}
          titulo="Velocidade da voz"
          valorTexto={`${prefs.speechRate.toFixed(1)}x`}
          min={0.6}
          max={1.8}
          step={0.1}
          value={prefs.speechRate}
          onChange={(v) => set("speechRate", v)}
        />
        <ToggleRow
          id="a11y-vlibras"
          icon={Languages}
          titulo="VLibras (Libras)"
          descricao="Tradutor oficial do Governo Federal, disponível em todas as páginas."
          chave="vlibras"
        />
      </section>
    </div>
  );
}
