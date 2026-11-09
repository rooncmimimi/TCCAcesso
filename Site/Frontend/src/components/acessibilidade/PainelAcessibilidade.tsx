import {
  ArrowDownUp,
  Contrast,
  Eye,
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
import { useIdioma } from "@/hooks/useIdioma";
import { Card, CardContent } from "@/components/ui/card";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useVoz } from "@/hooks/useVoz";
import { SliderRow, ToggleRow } from "@/components/acessibilidade/LinhasDeControle";
import { SecaoLeituraEFoco } from "@/components/acessibilidade/SecaoLeituraEFoco";
import { SecaoMotricidade } from "@/components/acessibilidade/SecaoMotricidade";

/** Amostra que reage imediatamente às preferências escolhidas. */
export function PreviaAcessibilidade() {
  const { t } = useIdioma();
  const { falar } = useVoz();
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="space-y-3 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("acessibilidade.painelAcessibilidade.preVisualizacaoEmTempoReal")}
        </p>
        <h3 className="text-lg font-extrabold">{t("acessibilidade.painelAcessibilidade.assistenteAdministrativoJrVaga")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("acessibilidade.painelAcessibilidade.grupoAuroraHibridoSaoPauloSp")}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            onClick={() =>
              falar(
                "Exemplo de leitura por voz do ACESSO. Assistente Administrativo Júnior, vaga inclusiva no Grupo Aurora.",
              )
            }
          >
            {t("acessibilidade.painelAcessibilidade.testarLeituraEmVozAlta")}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-input px-4 text-sm font-semibold"
          >
            {t("acessibilidade.painelAcessibilidade.botaoDeExemplo")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Todas as preferências de acessibilidade com a prévia ao vivo, usado em Configurações →
 * Acessibilidade e nas boas-vindas. Só altera o rascunho (`definir`); salvar fica a cargo da tela.
 */
export function PainelAcessibilidade() {
  const { t } = useIdioma();
  const { preferencias, definir } = useAcessibilidade();

  return (
    <div className="space-y-6">
      {/* Os grupos abaixo são títulos de nível 3; este nível 2 (só para leitor de tela) mantém a ordem dos títulos
          em todas as telas onde o painel aparece (configurações, boas-vindas e cadastro). */}
      <h2 className="sr-only">{t("acessibilidade.painelAcessibilidade.preferenciasDeAcessibilidade")}</h2>
      <PreviaAcessibilidade />

      <section aria-labelledby="grupo-visual" className="space-y-3">
        <h3 id="grupo-visual" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Visual
        </h3>
        <ToggleRow
          id="a11y-contrast"
          icon={Contrast}
          titulo={t("acessibilidade.painelAcessibilidade.altoContraste")}
          descricao={t("acessibilidade.painelAcessibilidade.aumentaOContrasteEntreTextos")}
          chave="highContrast"
        />
        <ToggleRow
          id="a11y-dark"
          icon={Moon}
          titulo={t("acessibilidade.painelAcessibilidade.modoEscuro")}
          descricao={t("acessibilidade.painelAcessibilidade.reduzOBrilhoDaTelaEmAmbientes")}
          chave="darkMode"
        />
        <ToggleRow
          id="a11y-dyslexia"
          icon={Type}
          titulo={t("acessibilidade.painelAcessibilidade.fonteParaDislexia")}
          descricao={t("acessibilidade.painelAcessibilidade.tipografiaComLetrasMais")}
          chave="dyslexiaFont"
        />
        <SliderRow
          id="a11y-font"
          icon={Type}
          titulo={t("acessibilidade.painelAcessibilidade.tamanhoDaFonte")}
          valorTexto={`${Math.round(preferencias.fontScale * 100)}%`}
          min={0.875}
          max={1.6}
          step={0.025}
          value={preferencias.fontScale}
          onChange={(v) => definir("fontScale", v)}
        />
        <SliderRow
          id="a11y-letter"
          icon={Waves}
          titulo={t("acessibilidade.painelAcessibilidade.espacamentoEntreLetras")}
          valorTexto={`${preferencias.letterSpacing.toFixed(3)} em`}
          min={0}
          max={0.16}
          step={0.005}
          value={preferencias.letterSpacing}
          onChange={(v) => definir("letterSpacing", v)}
        />
        <SliderRow
          id="a11y-line"
          icon={AlignVerticalSpaceAround}
          titulo={t("acessibilidade.painelAcessibilidade.espacamentoEntreLinhas")}
          valorTexto={preferencias.lineHeight.toFixed(2)}
          min={1.3}
          max={2.4}
          step={0.05}
          value={preferencias.lineHeight}
          onChange={(v) => definir("lineHeight", v)}
        />
      </section>

      {/* Não há controle de "Navegação por teclado": o Site inteiro já funciona só com teclado
          para todos (WCAG 2.1.1), e um interruptor aqui não teria efeito.
          `PreferenciasAcessibilidade.keyboardNav` continua no tipo para não invalidar
          preferências já salvas. */}
      <section aria-labelledby="grupo-navegacao" className="space-y-3">
        <h3
          id="grupo-navegacao"
          className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
        >
          {t("acessibilidade.painelAcessibilidade.navegacaoEInteracao")}
        </h3>
        <ToggleRow
          id="a11y-cursor"
          icon={MousePointer2}
          titulo={t("acessibilidade.painelAcessibilidade.cursorAmpliado")}
          descricao={t("acessibilidade.painelAcessibilidade.ponteiroDoMouseMaiorECom")}
          chave="bigCursor"
        />
        <ToggleRow
          id="a11y-motion"
          icon={Sparkles}
          titulo={t("acessibilidade.painelAcessibilidade.reduzirAnimacoes")}
          descricao={t("acessibilidade.painelAcessibilidade.removeTransicoesEMovimentosQue")}
          chave="reduceMotion"
        />
        <ToggleRow
          id="a11y-focus"
          icon={Target}
          titulo={t("acessibilidade.painelAcessibilidade.destaqueDeFocoDoTeclado")}
          descricao={t("acessibilidade.painelAcessibilidade.contornoBemVisivelNoElementoEm")}
          chave="focusHighlight"
        />
      </section>

      <SecaoLeituraEFoco />

      <SecaoMotricidade />

      <section aria-labelledby="grupo-assistivo" className="space-y-3">
        <h3
          id="grupo-assistivo"
          className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
        >
          {t("acessibilidade.painelAcessibilidade.recursosAssistivos")}
        </h3>
        <ToggleRow
          id="a11y-voice"
          icon={Volume2}
          titulo={t("inicio.recurso.voz.titulo")}
          descricao={t("acessibilidade.painelAcessibilidade.leEmVozAltaOsElementosAo")}
          chave="screenReader"
        />
        <ToggleRow
          id="a11y-arrow-reading"
          icon={ArrowDownUp}
          titulo={t("acessibilidade.painelAcessibilidade.navegarPeloConteudoComAsSetas")}
          descricao={
            preferencias.screenReader
              ? "As setas ↑ e ↓ percorrem títulos, textos e botões, e a voz lê cada um. Esc para de ler. Listas de opções, menus e controles deslizantes continuam usando as setas normalmente. Se você já usa NVDA, JAWS ou VoiceOver, deixe desligado."
              : "Ative a leitura por voz para usar as setas na leitura do conteúdo."
          }
          chave="arrowReading"
          desabilitado={!preferencias.screenReader}
        />
        <SliderRow
          id="a11y-rate"
          icon={Eye}
          titulo={t("acessibilidade.painelAcessibilidade.velocidadeDaVoz")}
          valorTexto={`${preferencias.speechRate.toFixed(1)}x`}
          min={0.6}
          max={1.8}
          step={0.1}
          value={preferencias.speechRate}
          onChange={(v) => definir("speechRate", v)}
        />
        <ToggleRow
          id="a11y-vlibras"
          icon={Languages}
          titulo="VLibras (Libras)"
          descricao={t("acessibilidade.painelAcessibilidade.tradutorOficialDoGoverno")}
          chave="vlibras"
        />
      </section>
    </div>
  );
}
