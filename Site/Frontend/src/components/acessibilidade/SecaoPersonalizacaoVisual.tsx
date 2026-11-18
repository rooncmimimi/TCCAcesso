import { useEffect, useRef, useState } from "react";
import { Check, Contrast, Droplets, Palette, RotateCcw, SunMedium } from "lucide-react";

import { AmostraDaPersonalizacao } from "@/components/acessibilidade/AmostraDaPersonalizacao";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectRow, SliderRow } from "@/components/acessibilidade/LinhasDeControle";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useIdioma } from "@/hooks/useIdioma";
import { avaliarContraste, formatarRazao } from "@/lib/contraste";
import {
  IDS_DOS_PADROES,
  LIMITES_VISUAIS,
  NOME_DO_PAPEL,
  PADROES_VISUAIS,
  PAPEIS,
  corDoPapel,
  paletaDoPadrao,
  type IdDoPadrao,
  type PapelDeCor,
} from "@/lib/padroesVisuais";
import { ajustesVisuais, visualPadrao } from "@/lib/preferenciasVisuais";
import type { ChaveBase } from "@/i18n/dicionarios";

/**
 * Personalização visual: um padrão de partida e, em cima dele, os ajustes de quem está usando.
 *
 * **Não é diagnóstico.** São formas de apresentar as cores, e a pessoa escolhe pelo que enxerga
 * melhor. Intensidade, saturação e brilho são preferência visual: não corrigem a visão de ninguém
 * nem reproduzem como outra pessoa enxerga.
 *
 * Tudo reage na hora (o provider aplica o rascunho no documento) e só é gravado no botão "Salvar
 * preferências" da própria página, como o resto do painel. Aqui dentro só existe o "restaurar esta
 * seção", que desfaz a personalização visual sem mexer nas outras preferências.
 */

/** "Nenhum" não está na tabela de padrões (ele é a ausência de padrão), mas tem cartão na tela. */
const TEXTOS_DO_NENHUM: Record<"nome" | "descricao" | "explicacao", ChaveBase> = {
  nome: "acessibilidade.personalizacaoVisual.nenhumNome",
  descricao: "acessibilidade.personalizacaoVisual.nenhumDescricao",
  explicacao: "acessibilidade.personalizacaoVisual.nenhumExplicacao",
};

function textosDoPadrao(id: IdDoPadrao) {
  if (id === "nenhum") return TEXTOS_DO_NENHUM;

  const padrao = PADROES_VISUAIS[id];

  return { nome: padrao.nome, descricao: padrao.descricao, explicacao: padrao.explicacao };
}

const OPCOES_DE_CONTRASTE: ReadonlyArray<{ valor: string; rotulo: ChaveBase }> = [
  { valor: "4.5", rotulo: "acessibilidade.personalizacaoVisual.contraste45" },
  { valor: "7", rotulo: "acessibilidade.personalizacaoVisual.contraste7" },
  { valor: "10", rotulo: "acessibilidade.personalizacaoVisual.contraste10" },
];

/**
 * Quanto tempo parado antes de aplicar a cor na página inteira.
 *
 * O seletor nativo de cor dispara um evento por movimento do ponteiro — dezenas por segundo. Cada um
 * desses eventos mudava uma variável do `:root`, e mudar o tema custa caro no navegador (medido em
 * produção: ~0,5 s por aplicação nesta tela). Sessenta eventos viravam meio minuto de página travada.
 *
 * Com a espera, a amostra só é repintada quando a pessoa **para** de mexer. O quadradinho de cor
 * acompanha o dedo na hora, porque ele é estado local e não passa pelo provider.
 */
const ESPERA_ANTES_DE_APLICAR_MS = 300;

/**
 * Uma linha da lista "Cores por significado": o seletor, o nome do papel, o contraste e o "voltar ao padrão".
 *
 * Guarda a cor em estado local enquanto a pessoa escolhe e só avisa a página quando ela para. O
 * contraste e a amostra acompanham a cor aplicada, não a que está sendo arrastada — o número ficaria
 * ilegível piscando a cada milímetro.
 */
function LinhaDeCor({
  papel,
  corAplicada,
  escolhida,
  razao,
  nivel,
  aoEscolher,
  aoVoltarAoPadrao,
}: {
  papel: PapelDeCor;
  corAplicada: string;
  escolhida: boolean;
  razao: number;
  nivel: string;
  aoEscolher: (papel: PapelDeCor, cor: string) => void;
  aoVoltarAoPadrao: (papel: PapelDeCor) => void;
}) {
  const { t } = useIdioma();
  const id = `visual-cor-${papel}`;
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const enviada = useRef<string | null>(null);
  const relogio = useRef<number | null>(null);

  const cancelar = () => {
    if (relogio.current !== null) window.clearTimeout(relogio.current);
    relogio.current = null;
  };

  // A cor mudou por fora (trocou de padrão, restaurou a seção): o campo larga o que estava editando.
  // A comparação com `enviada` evita que a nossa própria aplicação puxe o campo de volta no meio do arrasto.
  useEffect(() => {
    if (corAplicada !== enviada.current) {
      setEmEdicao(null);
      enviada.current = null;
    }
  }, [corAplicada]);

  useEffect(() => cancelar, []);

  const aplicar = (cor: string) => {
    cancelar();
    enviada.current = cor;
    aoEscolher(papel, cor);
  };

  const mexendo = (cor: string) => {
    setEmEdicao(cor);
    cancelar();
    relogio.current = window.setTimeout(() => aplicar(cor), ESPERA_ANTES_DE_APLICAR_MS);
  };

  const mostrada = emEdicao ?? corAplicada;

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <input
        id={id}
        type="color"
        value={mostrada}
        onChange={(e) => mexendo(e.target.value)}
        // O seletor fechou (ou o foco saiu): aplica agora, sem esperar.
        onBlur={(e) => aplicar(e.target.value)}
        className="size-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
      />

      <Label htmlFor={id} className="min-w-0 flex-1 text-sm font-semibold">
        {t(NOME_DO_PAPEL[papel])}
        <span className="block text-xs font-normal uppercase text-muted-foreground">{mostrada}</span>
      </Label>

      <span className={`text-xs ${nivel === "insuficiente" ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
        <span aria-hidden="true">{nivel === "insuficiente" ? "✕" : "✓"}</span>{" "}
        {t("acessibilidade.personalizacaoVisual.contrasteDoTexto", { razao: formatarRazao(razao) })}
      </span>

      {escolhida && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 text-xs"
          onClick={() => {
            cancelar();
            setEmEdicao(null);
            enviada.current = null;
            aoVoltarAoPadrao(papel);
          }}
        >
          {t("acessibilidade.personalizacaoVisual.voltarAoPadrao")}
        </Button>
      )}
    </li>
  );
}

export function SecaoPersonalizacaoVisual() {
  const { t } = useIdioma();
  const { preferencias, definir } = useAcessibilidade();
  const ajustes = ajustesVisuais(preferencias);
  const escuro = preferencias.darkMode;

  const trocarCor = (papel: PapelDeCor, cor: string | null) => {
    const cores = { ...preferencias.visualColors };

    if (cor) cores[papel] = cor;
    else delete cores[papel];

    definir("visualColors", cores);
  };

  const restaurarSecao = () => {
    const padrao = visualPadrao();

    for (const [chave, valor] of Object.entries(padrao)) {
      definir(chave as keyof typeof padrao, valor as never);
    }
  };

  return (
    <section aria-labelledby="grupo-personalizacao-visual" className="space-y-3">
      <h3
        id="grupo-personalizacao-visual"
        className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
      >
        {t("acessibilidade.personalizacaoVisual.titulo")}
      </h3>

      <p className="text-sm text-muted-foreground">
        {t("acessibilidade.personalizacaoVisual.descricao")}
      </p>

      {/* A amostra vem ANTES dos controles de proposito: a pessoa ve o que vai mudar, e so depois
          mexe. Ela nao recebe nada por propriedade — le as mesmas variaveis de cor do documento que
          o resto do site le, entao o que aparece aqui e o que vai aparecer na tela de verdade. */}
      <AmostraDaPersonalizacao />

      {/* ---------------------------------------------------------------- os padrões */}
      <div role="radiogroup" aria-labelledby="padroes-visuais-titulo" className="space-y-2">
        <p id="padroes-visuais-titulo" className="text-sm font-bold">
          {t("acessibilidade.personalizacaoVisual.escolherPadrao")}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {IDS_DOS_PADROES.map((id) => {
            const textos = textosDoPadrao(id);
            const escolhido = preferencias.visualPattern === id;
            const paleta = paletaDoPadrao(id, escuro);

            return (
              <label
                key={id}
                className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 ${
                  escolhido ? "border-primary bg-primary-soft" : "border-border bg-card"
                }`}
              >
                <input
                  type="radio"
                  name="padrao-visual"
                  value={id}
                  checked={escolhido}
                  onChange={() => definir("visualPattern", id)}
                  aria-describedby={`padrao-${id}-explicacao`}
                  className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
                />

                <span className="min-w-0 space-y-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                    {textos.nome ? t(textos.nome) : id}
                    {/* O "escolhido" não fica só na cor da borda. */}
                    {escolhido && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        <Check className="size-3.5" aria-hidden="true" />
                        {t("acessibilidade.personalizacaoVisual.selecionado")}
                      </span>
                    )}
                  </span>

                  <span className="block text-xs">{t(textos.descricao)}</span>

                  <span id={`padrao-${id}-explicacao`} className="block text-xs text-muted-foreground">
                    {t(textos.explicacao)}
                  </span>

                  {/* Amostra: enfeite. Quem explica o padrão é o texto acima. */}
                  <span aria-hidden="true" className="flex gap-1 pt-1">
                    {PAPEIS.map((papel) => (
                      <span
                        key={papel}
                        className="size-5 rounded border border-border"
                        style={{ background: paleta[papel]?.fundo ?? "transparent" }}
                      />
                    ))}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------------- ajuste fino */}
      <p className="pt-2 text-sm font-bold">{t("acessibilidade.personalizacaoVisual.ajustesTitulo")}</p>
      <p className="text-xs text-muted-foreground">
        {t("acessibilidade.personalizacaoVisual.ajustesDescricao")}
      </p>

      <SliderRow
        id="visual-intensidade"
        icon={Palette}
        titulo={t("acessibilidade.personalizacaoVisual.intensidade")}
        valorTexto={`${preferencias.visualIntensity}%`}
        min={LIMITES_VISUAIS.intensidade.min}
        max={LIMITES_VISUAIS.intensidade.max}
        step={LIMITES_VISUAIS.intensidade.passo}
        value={preferencias.visualIntensity}
        onChange={(v) => definir("visualIntensity", v)}
      />

      <SliderRow
        id="visual-saturacao"
        icon={Droplets}
        titulo={t("acessibilidade.personalizacaoVisual.saturacao")}
        valorTexto={`${preferencias.visualSaturation}%`}
        min={LIMITES_VISUAIS.saturacao.min}
        max={LIMITES_VISUAIS.saturacao.max}
        step={LIMITES_VISUAIS.saturacao.passo}
        value={preferencias.visualSaturation}
        onChange={(v) => definir("visualSaturation", v)}
      />

      <SliderRow
        id="visual-brilho"
        icon={SunMedium}
        titulo={t("acessibilidade.personalizacaoVisual.brilho")}
        valorTexto={`${preferencias.visualBrightness}%`}
        min={LIMITES_VISUAIS.brilho.min}
        max={LIMITES_VISUAIS.brilho.max}
        step={LIMITES_VISUAIS.brilho.passo}
        value={preferencias.visualBrightness}
        onChange={(v) => definir("visualBrightness", v)}
      />

      <SelectRow
        id="visual-contraste"
        icon={Contrast}
        titulo={t("acessibilidade.personalizacaoVisual.contraste")}
        valor={String(preferencias.visualContrast)}
        opcoes={OPCOES_DE_CONTRASTE}
        onChange={(v) => definir("visualContrast", Number(v))}
      />

      {/* ---------------------------------------------------------------- cor por significado */}
      <p className="pt-2 text-sm font-bold">{t("acessibilidade.personalizacaoVisual.coresTitulo")}</p>
      <p className="text-xs text-muted-foreground">
        {t("acessibilidade.personalizacaoVisual.coresDescricao")}
      </p>

      <ul className="space-y-2">
        {PAPEIS.map((papel) => {
          const par = corDoPapel(papel, preferencias.visualPattern, escuro, ajustes);
          const { razao, nivel } = avaliarContraste(par.fundo, par.texto, preferencias.visualContrast);
          const escolhida = Boolean(preferencias.visualColors[papel]);

          return (
            <LinhaDeCor
              key={papel}
              papel={papel}
              corAplicada={par.fundo}
              escolhida={escolhida}
              razao={razao}
              nivel={nivel}
              aoEscolher={(qual, cor) => trocarCor(qual, cor)}
              aoVoltarAoPadrao={(qual) => trocarCor(qual, null)}
            />
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="outline" className="min-h-11" onClick={restaurarSecao}>
          <RotateCcw className="size-4" aria-hidden="true" />{" "}
          {t("acessibilidade.personalizacaoVisual.restaurarSecao")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("acessibilidade.personalizacaoVisual.aviso")}
      </p>
    </section>
  );
}

