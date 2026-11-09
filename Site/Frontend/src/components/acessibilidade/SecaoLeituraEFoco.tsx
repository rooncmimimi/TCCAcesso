import { Link } from "@tanstack/react-router";
import {
  Stethoscope,
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
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { avaliarContraste, ehCorHex, formatarRazao } from "@/lib/contraste";
import { SelectRow, SliderRow, ToggleRow } from "@/components/acessibilidade/LinhasDeControle";
import { DURACAO_MAXIMA_DO_AVISO } from "@/lib/avisos";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

type ChaveDeCor = "colorText" | "colorBg" | "colorLink" | "colorFocus";

const CORES: ReadonlyArray<{ chave: ChaveDeCor; id: string; rotulo: ChaveBase }> = [
  { chave: "colorText", id: "a11y-cor-texto", rotulo: "acessibilidade.secaoLeituraEFoco.texto" },
  { chave: "colorBg", id: "a11y-cor-fundo", rotulo: "acessibilidade.secaoLeituraEFoco.fundo" },
  { chave: "colorLink", id: "a11y-cor-link", rotulo: "acessibilidade.secaoLeituraEFoco.links" },
  { chave: "colorFocus", id: "a11y-cor-foco", rotulo: "acessibilidade.secaoLeituraEFoco.contornoDeFoco" },
];

/** Cada par de cores que importa, com o mínimo de contraste do WCAG para o que ele mostra. */
function pares(p: PreferenciasAcessibilidade): ReadonlyArray<{ id: string; rotulo: ChaveBase; frente: string; fundo: string; minimo: number }> {
  return [
    { id: "texto", rotulo: "acessibilidade.secaoLeituraEFoco.textoSobreOFundo", frente: p.colorText, fundo: p.colorBg, minimo: 4.5 },
    { id: "links", rotulo: "acessibilidade.secaoLeituraEFoco.linksSobreOFundo", frente: p.colorLink, fundo: p.colorBg, minimo: 4.5 },
    { id: "foco", rotulo: "acessibilidade.secaoLeituraEFoco.contornoDeFocoSobreOFundo", frente: p.colorFocus, fundo: p.colorBg, minimo: 3 },
  ];
}

/**
 * Controles do Bloco 1: destaque de leitura, régua, avisos, modo foco, modo leitura, cores à escolha
 * e modo para daltonismo. Tudo reage na hora, como o resto do painel, e só é gravado ao salvar.
 */
export function SecaoLeituraEFoco() {
  const { t } = useIdioma();
  const { preferencias, definir } = useAcessibilidade();
  const minutosDoAviso = Math.round(DURACAO_MAXIMA_DO_AVISO / 60_000);

  return (
    <section aria-labelledby="grupo-leitura" className="space-y-3">
      <h3 id="grupo-leitura" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("acessibilidade.secaoLeituraEFoco.leituraFocoECores")}
      </h3>

      <ToggleRow
        id="a11y-word-highlight"
        icon={Highlighter}
        titulo={t("acessibilidade.secaoLeituraEFoco.destacarAPalavraQueEstaSendo")}
        descricao={t("acessibilidade.secaoLeituraEFoco.comOBotaoOuvirOuOCursorDe")}
        chave="wordHighlight"
      />
      {preferencias.wordHighlight && (
        <ToggleRow
          id="a11y-estimated-highlight"
          icon={Highlighter}
          titulo={t("acessibilidade.secaoLeituraEFoco.estimarAPalavraEmVozesQueNao")}
          descricao={t("acessibilidade.secaoLeituraEFoco.algumasVozesComoAsDeRedeE")}
          chave="estimatedHighlight"
        />
      )}
      <Link to="/diagnostico-de-voz" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-2">
        <Stethoscope className="size-4" aria-hidden="true" /> {t("acessibilidade.secaoLeituraEFoco.testarALeituraEmVozAltaNeste")}
      </Link>

      <ToggleRow
        id="a11y-ruler"
        icon={Ruler}
        titulo={t("acessibilidade.secaoLeituraEFoco.reguaDeLeitura")}
        descricao={t("acessibilidade.secaoLeituraEFoco.umaFaixaClaraAcompanhaOMouseOu")}
        chave="readingRuler"
      />
      {preferencias.readingRuler && (
        <>
          <SliderRow
            id="a11y-ruler-height"
            icon={ScanEye}
            titulo={t("acessibilidade.secaoLeituraEFoco.alturaDaRegua")}
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
            titulo={t("acessibilidade.secaoLeituraEFoco.escurecimentoDoRestoDaTela")}
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
        titulo={t("acessibilidade.secaoLeituraEFoco.manterAvisosNaTelaAteEuFechar")}
        descricao={t("acessibilidade.secaoLeituraEFoco.confirmacoesEErrosGanhamUm", { var1: minutosDoAviso })}
        chave="persistentToasts"
      />

      <ToggleRow
        id="a11y-focus-mode"
        icon={Focus}
        titulo={t("acessibilidade.secaoLeituraEFoco.modoFoco")}
        descricao={t("acessibilidade.secaoLeituraEFoco.escondeColunasLateraisEORodape")}
        chave="focusMode"
      />

      <ToggleRow
        id="a11y-reading-mode"
        icon={BookOpen}
        titulo={t("acessibilidade.secaoLeituraEFoco.modoLeitura")}
        descricao={t("acessibilidade.secaoLeituraEFoco.colunaEstreitaTextoAlinhadoA")}
        chave="readingMode"
      />
      {preferencias.readingMode && (
        <>
          <SelectRow
            id="a11y-reading-bg"
            icon={Palette}
            titulo={t("acessibilidade.secaoLeituraEFoco.fundoDoModoLeitura")}
            valor={preferencias.readingBg}
            opcoes={[
              { valor: "padrao", rotulo: "acessibilidade.secaoLeituraEFoco.padraoDoSite" },
              { valor: "creme", rotulo: "acessibilidade.secaoLeituraEFoco.cremeMenosBrilho" },
              { valor: "escuro", rotulo: "acessibilidade.secaoLeituraEFoco.escuro" },
            ]}
            onChange={(v) => definir("readingBg", v)}
          />
          <SelectRow
            id="a11y-reading-font"
            icon={TextCursorInput}
            titulo={t("acessibilidade.secaoLeituraEFoco.fonteDoModoLeitura")}
            valor={preferencias.readingFont}
            opcoes={[
              { valor: "padrao", rotulo: "acessibilidade.secaoLeituraEFoco.padraoDoSite" },
              { valor: "hiperlegivel", rotulo: "acessibilidade.secaoLeituraEFoco.atkinsonHyperlegibleLetrasBem" },
              { valor: "sem-serifa", rotulo: "acessibilidade.secaoLeituraEFoco.semSerifaVerdana" },
              { valor: "serifada", rotulo: "acessibilidade.secaoLeituraEFoco.comSerifaGeorgia" },
            ]}
            onChange={(v) => definir("readingFont", v)}
          />
        </>
      )}

      {/* O antigo "modo para daltonismo" virou a seção "Personalização visual", que tem padrão por
          tipo e ajustes. Quem tinha o interruptor ligado foi migrado para o "Padrão acessível"
          (ver `normalizarVisual`), que é exatamente o que ele fazia. */}
      <ToggleRow
        id="a11y-custom-colors"
        icon={Palette}
        titulo={t("acessibilidade.secaoLeituraEFoco.coresPersonalizadas")}
        descricao={t("acessibilidade.secaoLeituraEFoco.escolhaAsCoresDeTextoFundo")}
        chave="customColors"
      />
      {preferencias.customColors && <CoresPersonalizadas />}
    </section>
  );
}

function CoresPersonalizadas() {
  const { t } = useIdioma();
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
              {t(rotulo)}
              <span className="block text-xs font-normal uppercase text-muted-foreground">{preferencias[chave]}</span>
            </label>
          </div>
        ))}
      </div>

      {todasValidas ? (
        <ul aria-label={t("acessibilidade.secaoLeituraEFoco.contrasteDasCoresEscolhidas")} className="space-y-1.5 text-sm">
          {pares(preferencias).map(({ id, rotulo, frente, fundo, minimo }) => {
            const { razao, nivel } = avaliarContraste(frente, fundo, minimo);
            const ok = nivel !== "insuficiente";
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-2">
                <span aria-hidden="true">{ok ? "✓" : "✕"}</span>
                <span className="font-medium">{t(rotulo)}:</span>
                <span className="tabular-nums">{formatarRazao(razao)}</span>
                <span className={ok ? "text-muted-foreground" : "font-semibold text-destructive"}>
                  {ok
                    ? t("acessibilidade.secaoLeituraEFoco.legivelMinimo", { var1: formatarRazao(minimo) })
                    : t("acessibilidade.secaoLeituraEFoco.dificilDeLerOMinimoRecomendado", { var1: formatarRazao(minimo) })}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {t("acessibilidade.secaoLeituraEFoco.algumaCorEstaInvalidaAsCores")}
        </p>
      )}
    </div>
  );
}
