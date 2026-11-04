import {
  BellRing,
  BookOpen,
  Focus,
  Highlighter,
  Palette,
  Ruler,
  SunDim,
  ScanEye,
  TextCursorInput,
} from "lucide-react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { avaliarContraste, ehCorHex, formatarRazao } from "@/lib/contraste";
import { SelectRow, SliderRow, ToggleRow } from "@/components/acessibilidade/LinhasDeControle";
import { DURACAO_MAXIMA_DO_AVISO } from "@/lib/avisos";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

type ChaveDeCor = "colorText" | "colorBg" | "colorLink" | "colorFocus";

const CORES: ReadonlyArray<{ chave: ChaveDeCor; id: string; rotulo: string }> = [
  { chave: "colorText", id: "a11y-cor-texto", rotulo: "Texto" },
  { chave: "colorBg", id: "a11y-cor-fundo", rotulo: "Fundo" },
  { chave: "colorLink", id: "a11y-cor-link", rotulo: "Links" },
  { chave: "colorFocus", id: "a11y-cor-foco", rotulo: "Contorno de foco" },
];

/** Cada par de cores que importa, com o mínimo de contraste do WCAG para o que ele mostra. */
function pares(p: PreferenciasAcessibilidade) {
  return [
    { id: "texto", rotulo: "Texto sobre o fundo", frente: p.colorText, fundo: p.colorBg, minimo: 4.5 },
    { id: "links", rotulo: "Links sobre o fundo", frente: p.colorLink, fundo: p.colorBg, minimo: 4.5 },
    { id: "foco", rotulo: "Contorno de foco sobre o fundo", frente: p.colorFocus, fundo: p.colorBg, minimo: 3 },
  ];
}

/**
 * Controles do Bloco 1: destaque de leitura, régua, avisos, modo foco, modo leitura, cores à escolha
 * e modo para daltonismo. Tudo reage na hora, como o resto do painel, e só é gravado ao salvar.
 */
export function SecaoLeituraEFoco() {
  const { preferencias, definir } = useAcessibilidade();
  const minutosDoAviso = Math.round(DURACAO_MAXIMA_DO_AVISO / 60_000);

  return (
    <section aria-labelledby="grupo-leitura" className="space-y-3">
      <h3 id="grupo-leitura" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Leitura, foco e cores
      </h3>

      <ToggleRow
        id="a11y-word-highlight"
        icon={Highlighter}
        titulo="Destacar a palavra que está sendo lida"
        descricao="Com o botão Ouvir ou o cursor de leitura, a palavra dita fica marcada. Se a voz do seu navegador não informar as palavras, o destaque passa a ser por frase."
        chave="wordHighlight"
      />

      <ToggleRow
        id="a11y-ruler"
        icon={Ruler}
        titulo="Régua de leitura"
        descricao="Uma faixa clara acompanha o mouse ou o foco do teclado e escurece o resto da tela. Alt + ↑ ou ↓ sobe e desce a faixa."
        chave="readingRuler"
      />
      {preferencias.readingRuler && (
        <>
          <SliderRow
            id="a11y-ruler-height"
            icon={ScanEye}
            titulo="Altura da régua"
            valorTexto={`${preferencias.rulerHeight} px`}
            min={24}
            max={160}
            step={4}
            value={preferencias.rulerHeight}
            onChange={(v) => definir("rulerHeight", v)}
          />
          <SliderRow
            id="a11y-ruler-dim"
            icon={SunDim}
            titulo="Escurecimento do resto da tela"
            valorTexto={`${Math.round(preferencias.rulerDim * 100)}%`}
            min={0.2}
            max={0.85}
            step={0.05}
            value={preferencias.rulerDim}
            onChange={(v) => definir("rulerDim", v)}
          />
        </>
      )}

      <ToggleRow
        id="a11y-persistent-toasts"
        icon={BellRing}
        titulo="Manter avisos na tela até eu fechar"
        descricao={`Confirmações e erros ganham um botão de fechar e não somem sozinhos. Por segurança, saem depois de ${minutosDoAviso} minutos.`}
        chave="persistentToasts"
      />

      <ToggleRow
        id="a11y-focus-mode"
        icon={Focus}
        titulo="Modo foco"
        descricao="Esconde colunas laterais e o rodapé, e deixa só o que importa para a tarefa."
        chave="focusMode"
      />

      <ToggleRow
        id="a11y-reading-mode"
        icon={BookOpen}
        titulo="Modo leitura"
        descricao="Coluna estreita, texto alinhado à esquerda e mais espaço entre linhas e parágrafos."
        chave="readingMode"
      />
      {preferencias.readingMode && (
        <>
          <SelectRow
            id="a11y-reading-bg"
            icon={Palette}
            titulo="Fundo do modo leitura"
            valor={preferencias.readingBg}
            opcoes={[
              { valor: "padrao", rotulo: "Padrão do site" },
              { valor: "creme", rotulo: "Creme (menos brilho)" },
              { valor: "escuro", rotulo: "Escuro" },
            ]}
            onChange={(v) => definir("readingBg", v)}
          />
          <SelectRow
            id="a11y-reading-font"
            icon={TextCursorInput}
            titulo="Fonte do modo leitura"
            valor={preferencias.readingFont}
            opcoes={[
              { valor: "padrao", rotulo: "Padrão do site" },
              { valor: "sem-serifa", rotulo: "Sem serifa (Verdana)" },
              { valor: "serifada", rotulo: "Com serifa (Georgia)" },
            ]}
            onChange={(v) => definir("readingFont", v)}
          />
        </>
      )}

      <ToggleRow
        id="a11y-colorblind"
        icon={Palette}
        titulo="Modo para daltonismo"
        descricao="Troca vermelho e verde por laranja e azul, põe um símbolo em erros e avisos e sublinha os links do conteúdo."
        chave="colorBlind"
      />

      <ToggleRow
        id="a11y-custom-colors"
        icon={Palette}
        titulo="Cores personalizadas"
        descricao="Escolha as cores de texto, fundo, links e do contorno de foco. Mostramos o contraste de cada par."
        chave="customColors"
      />
      {preferencias.customColors && <CoresPersonalizadas />}
    </section>
  );
}

function CoresPersonalizadas() {
  const { preferencias, definir } = useAcessibilidade();
  const todasValidas = CORES.every(({ chave }) => ehCorHex(preferencias[chave]));

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CORES.map(({ chave, id, rotulo }) => (
          <div key={chave} className="flex items-center gap-3">
            <input
              id={id}
              type="color"
              value={ehCorHex(preferencias[chave]) ? preferencias[chave] : "#000000"}
              onChange={(e) => definir(chave, e.target.value)}
              className="size-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <label htmlFor={id} className="min-w-0 text-sm font-semibold">
              {rotulo}
              <span className="block text-xs font-normal uppercase text-muted-foreground">{preferencias[chave]}</span>
            </label>
          </div>
        ))}
      </div>

      {todasValidas ? (
        <ul aria-label="Contraste das cores escolhidas" className="space-y-1.5 text-sm">
          {pares(preferencias).map(({ id, rotulo, frente, fundo, minimo }) => {
            const { razao, nivel } = avaliarContraste(frente, fundo, minimo);
            const ok = nivel !== "insuficiente";
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-2">
                <span aria-hidden="true">{ok ? "✓" : "✕"}</span>
                <span className="font-medium">{rotulo}:</span>
                <span className="tabular-nums">{formatarRazao(razao)}</span>
                <span className={ok ? "text-muted-foreground" : "font-semibold text-destructive"}>
                  {ok
                    ? `legível (mínimo ${formatarRazao(minimo)})`
                    : `difícil de ler: o mínimo recomendado é ${formatarRazao(minimo)}`}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p role="alert" className="text-sm font-semibold text-destructive">
          Alguma cor está inválida. As cores personalizadas ficam desligadas até todas serem válidas.
        </p>
      )}
    </div>
  );
}
