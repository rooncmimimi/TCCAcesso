import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookUser, Compass, Hand, Keyboard, MessageSquareText, ScanLine, ShieldCheck, Timer, Layers, Ruler, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectRow, SliderRow, ToggleRow } from "@/components/acessibilidade/LinhasDeControle";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { abrirAjudaDeAtalhos } from "@/hooks/useAtalhosDeTeclado";
import { LIMITES, nomeDaTecla } from "@/lib/preferenciasMotoras";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import { Frase } from "@/i18n/Frase";

const OPCOES_DE_ALVO: ReadonlyArray<{ valor: PreferenciasAcessibilidade["targetSize"]; rotulo: ChaveBase }> = [
  { valor: "padrao", rotulo: "acessibilidade.secaoMotricidade.padrao44Px" },
  { valor: "grande", rotulo: "acessibilidade.secaoMotricidade.grande56Px" },
  { valor: "maior", rotulo: "acessibilidade.secaoMotricidade.maior72Px" },
];

/** As teclas que já selecionam ou que não fazem sentido como acionador. */
const TECLAS_RESERVADAS = new Set([" ", "Enter", "Escape", "Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph"]);

/** Escolha da tecla extra de seleção: a próxima tecla apertada vira o acionador. */
function EscolhaDaTeclaExtra() {
  const { t } = useIdioma();
  const { preferencias, definir } = useAcessibilidade();
  const [ouvindo, setOuvindo] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!ouvindo) return undefined;

    const aoApertar = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setAviso(t("acessibilidade.secaoMotricidade.escolhaCancelada"));
      } else if (TECLAS_RESERVADAS.has(e.key)) {
        setAviso(t("acessibilidade.secaoMotricidade.naoPodeSerATeclaExtraEspacoE", { var1: nomeDaTecla(e.key) }));

        return;
      } else {
        definir("scanKey", e.key);
        setAviso(`Tecla extra: ${nomeDaTecla(e.key)}.`);
      }

      setOuvindo(false);
    };

    window.addEventListener("keydown", aoApertar, true);

    return () => window.removeEventListener("keydown", aoApertar, true);
  }, [ouvindo, definir, t]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-bold">{t("acessibilidade.secaoMotricidade.teclaExtraParaSelecionar")}</p>
      <p className="text-sm text-muted-foreground">{t("acessibilidade.secaoMotricidade.espacoEEnterJaSelecionamOItem")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm">
          Tecla atual: <strong>{preferencias.scanKey ? nomeDaTecla(preferencias.scanKey) : "nenhuma"}</strong>
        </span>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => { setAviso(""); setOuvindo(true); }} aria-pressed={ouvindo}>
          {ouvindo ? "Aperte a tecla…" : t("acessibilidade.secaoMotricidade.escolherTecla")}
        </Button>
        {preferencias.scanKey ? (
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => { definir("scanKey", ""); setAviso("Tecla extra removida."); }}>
            {t("acessibilidade.paineisDeAjuda.remover")}
          </Button>
        ) : null}
      </div>
      <p role="status" className="mt-2 text-sm text-muted-foreground">
        {aviso}
      </p>
    </div>
  );
}

function AtalhoParaRecurso({ to, icone: Icone, titulo, detalhe }: { to: string; icone: typeof Compass; titulo: string; detalhe: string }) {
  return (
    <Button asChild variant="outline" className="h-auto min-h-14 justify-start gap-3 px-4 py-3 text-left">
      <Link to={to}>
        <Icone className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-sm font-bold">{titulo}</span>
          <span className="block whitespace-normal text-xs font-normal text-muted-foreground">{detalhe}</span>
        </span>
      </Link>
    </Button>
  );
}

/**
 * Controles do Bloco 4: varredura com um botão, proteção contra tremores, tamanho dos alvos e
 * atalhos de teclado, mais a porta de entrada para a central de comunicação, o dicionário de
 * profissões e a navegação por objetivos. Como o resto do painel, reage na hora e só é gravado ao salvar.
 */
export function SecaoMotricidade() {
  const { t } = useIdioma();
  const { preferencias, definir } = useAcessibilidade();

  return (
    <section aria-labelledby="grupo-motricidade" className="space-y-3">
      <h3 id="grupo-motricidade" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {t("acessibilidade.secaoMotricidade.motricidadeEComunicacao")}
      </h3>

      <ToggleRow
        id="a11y-scanning"
        icon={ScanLine}
        titulo={t("acessibilidade.secaoMotricidade.varreduraComUmBotao")}
        descricao={t("acessibilidade.secaoMotricidade.mostraUmPainelQuePercorreOs")}
        chave="scanning"
      />
      {preferencias.scanning && (
        <>
          <SliderRow
            id="a11y-scan-speed"
            icon={Timer}
            titulo={t("acessibilidade.secaoMotricidade.tempoEmCadaItem")}
            valorTexto={`${preferencias.scanSpeed.toFixed(1).replace(".", ",")} s`}
            min={LIMITES.scanSpeed.min}
            max={LIMITES.scanSpeed.max}
            step={LIMITES.scanSpeed.passo}
            value={preferencias.scanSpeed}
            onChange={(v) => definir("scanSpeed", Math.round(v * 10) / 10)}
          />
          <ToggleRow
            id="a11y-scan-groups"
            icon={Layers}
            titulo={t("acessibilidade.secaoMotricidade.varrerPorGrupos")}
            descricao={t("acessibilidade.secaoMotricidade.primeiroPassaPelosBlocosDaTela")}
            chave="scanGroups"
          />
          <EscolhaDaTeclaExtra />
        </>
      )}

      <ToggleRow
        id="a11y-tremor"
        icon={Hand}
        titulo={t("acessibilidade.secaoMotricidade.protecaoContraTremores")}
        descricao={t("acessibilidade.secaoMotricidade.ignoraUmSegundoToqueNoMesmo")}
        chave="tremorGuard"
      />
      {preferencias.tremorGuard && (
        <SliderRow
          id="a11y-tremor-delay"
          icon={ShieldCheck}
          titulo={t("acessibilidade.secaoMotricidade.intervaloEntreToquesNoMesmo")}
          valorTexto={`${(preferencias.tremorDelay / 1000).toFixed(1).replace(".", ",")} s`}
          min={LIMITES.tremorDelay.min}
          max={LIMITES.tremorDelay.max}
          step={LIMITES.tremorDelay.passo}
          value={preferencias.tremorDelay}
          onChange={(v) => definir("tremorDelay", v)}
        />
      )}

      <SelectRow id="a11y-target-size" icon={Ruler} titulo={t("acessibilidade.secaoMotricidade.tamanhoDosBotoesEDasAreasDe")} valor={preferencias.targetSize} opcoes={OPCOES_DE_ALVO} onChange={(v) => definir("targetSize", v)} />

      <ToggleRow
        id="a11y-shortcuts"
        icon={Keyboard}
        titulo={t("acessibilidade.secaoMotricidade.atalhosDeTeclado")}
        descricao={t("acessibilidade.secaoMotricidade.aperteGEDepoisVParaIrAsVagasGE")}
        chave="shortcuts"
      />
      <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={abrirAjudaDeAtalhos}>
        <Keyboard className="size-4" aria-hidden="true" /> {t("acessibilidade.secaoMotricidade.verAListaDeAtalhos")}
      </Button>

      <div className="grid gap-2 pt-2">
        <AtalhoParaRecurso to="/comunicacao" icone={MessageSquareText} titulo={t("acessibilidade.secaoMotricidade.centralDeComunicacao")} detalhe={t("acessibilidade.secaoMotricidade.cartoesEFrasesProntasPara")} />
        <AtalhoParaRecurso to="/profissoes" icone={BookUser} titulo={t("acessibilidade.secaoMotricidade.dicionarioDeProfissoes")} detalhe={t("acessibilidade.secaoMotricidade.oQueCadaProfissaoFazCom")} />
        <AtalhoParaRecurso to="/objetivos" icone={Compass} titulo={t("acessibilidade.secaoMotricidade.oQueVoceQuerFazer")} detalhe={t("acessibilidade.secaoMotricidade.caminhosGuiadosSoComOsPassosDe")} />
        <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Mic className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <Frase
              chave="acessibilidade.secaoMotricidade.comandosDeVozExplicacao"
              partes={[(texto) => <strong className="text-foreground">{texto}</strong>]}
            />
          </span>
        </p>
      </div>
    </section>
  );
}
