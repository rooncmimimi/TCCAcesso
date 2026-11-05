import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookUser, Compass, Hand, Keyboard, MessageSquareText, ScanLine, ShieldCheck, Timer, Layers, Ruler, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectRow, SliderRow, ToggleRow } from "@/components/acessibilidade/LinhasDeControle";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { abrirAjudaDeAtalhos } from "@/hooks/useAtalhosDeTeclado";
import { LIMITES, nomeDaTecla } from "@/lib/preferenciasMotoras";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

const OPCOES_DE_ALVO: ReadonlyArray<{ valor: PreferenciasAcessibilidade["targetSize"]; rotulo: string }> = [
  { valor: "padrao", rotulo: "Padrão (44 px)" },
  { valor: "grande", rotulo: "Grande (56 px)" },
  { valor: "maior", rotulo: "Maior (72 px)" },
];

/** As teclas que já selecionam ou que não fazem sentido como acionador. */
const TECLAS_RESERVADAS = new Set([" ", "Enter", "Escape", "Tab", "Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph"]);

/** Escolha da tecla extra de seleção: a próxima tecla apertada vira o acionador. */
function EscolhaDaTeclaExtra() {
  const { preferencias, definir } = useAcessibilidade();
  const [ouvindo, setOuvindo] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!ouvindo) return undefined;

    const aoApertar = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setAviso("Escolha cancelada.");
      } else if (TECLAS_RESERVADAS.has(e.key)) {
        setAviso(`${nomeDaTecla(e.key)} não pode ser a tecla extra (Espaço e Enter já selecionam). Aperte outra tecla ou Esc para cancelar.`);

        return;
      } else {
        definir("scanKey", e.key);
        setAviso(`Tecla extra: ${nomeDaTecla(e.key)}.`);
      }

      setOuvindo(false);
    };

    window.addEventListener("keydown", aoApertar, true);

    return () => window.removeEventListener("keydown", aoApertar, true);
  }, [ouvindo, definir]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-bold">Tecla extra para selecionar</p>
      <p className="text-sm text-muted-foreground">Espaço e Enter já selecionam o item destacado. Se o seu acionador envia outra tecla, escolha-a aqui.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm">
          Tecla atual: <strong>{preferencias.scanKey ? nomeDaTecla(preferencias.scanKey) : "nenhuma"}</strong>
        </span>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => { setAviso(""); setOuvindo(true); }} aria-pressed={ouvindo}>
          {ouvindo ? "Aperte a tecla…" : "Escolher tecla"}
        </Button>
        {preferencias.scanKey ? (
          <Button type="button" variant="ghost" className="min-h-11" onClick={() => { definir("scanKey", ""); setAviso("Tecla extra removida."); }}>
            Remover
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
  const { preferencias, definir } = useAcessibilidade();

  return (
    <section aria-labelledby="grupo-motricidade" className="space-y-3">
      <h3 id="grupo-motricidade" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Motricidade e comunicação
      </h3>

      <ToggleRow
        id="a11y-scanning"
        icon={ScanLine}
        titulo="Varredura com um botão"
        descricao="Mostra um painel que percorre os botões, links e campos da tela, um de cada vez. Você escolhe o item apertando Espaço, Enter ou o seu acionador. Complementa (não substitui) a varredura do Windows, do Android e de aparelhos assistivos."
        chave="scanning"
      />
      {preferencias.scanning && (
        <>
          <SliderRow
            id="a11y-scan-speed"
            icon={Timer}
            titulo="Tempo em cada item"
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
            titulo="Varrer por grupos"
            descricao="Primeiro passa pelos blocos da tela (menu, cada seção, cada formulário); ao selecionar um bloco, percorre só os controles dele. Em telas cheias, chega mais rápido ao que você quer."
            chave="scanGroups"
          />
          <EscolhaDaTeclaExtra />
        </>
      )}

      <ToggleRow
        id="a11y-tremor"
        icon={Hand}
        titulo="Proteção contra tremores"
        descricao="Ignora um segundo toque no mesmo botão logo depois do primeiro. Outros botões não são afetados. O envio repetido de formulários já é evitado para todos."
        chave="tremorGuard"
      />
      {preferencias.tremorGuard && (
        <SliderRow
          id="a11y-tremor-delay"
          icon={ShieldCheck}
          titulo="Intervalo entre toques no mesmo botão"
          valorTexto={`${(preferencias.tremorDelay / 1000).toFixed(1).replace(".", ",")} s`}
          min={LIMITES.tremorDelay.min}
          max={LIMITES.tremorDelay.max}
          step={LIMITES.tremorDelay.passo}
          value={preferencias.tremorDelay}
          onChange={(v) => definir("tremorDelay", v)}
        />
      )}

      <SelectRow id="a11y-target-size" icon={Ruler} titulo="Tamanho dos botões e das áreas de toque" valor={preferencias.targetSize} opcoes={OPCOES_DE_ALVO} onChange={(v) => definir("targetSize", v)} />

      <ToggleRow
        id="a11y-shortcuts"
        icon={Keyboard}
        titulo="Atalhos de teclado"
        descricao="Aperte G e depois V para ir às vagas, G e M para mensagens, / para pesquisar e ? para ver todos. Não funcionam enquanto você digita em um campo."
        chave="shortcuts"
      />
      <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={abrirAjudaDeAtalhos}>
        <Keyboard className="size-4" aria-hidden="true" /> Ver a lista de atalhos
      </Button>

      <div className="grid gap-2 pt-2">
        <AtalhoParaRecurso to="/comunicacao" icone={MessageSquareText} titulo="Central de comunicação" detalhe="Cartões e frases prontas para mostrar, ouvir ou usar numa conversa." />
        <AtalhoParaRecurso to="/profissoes" icone={BookUser} titulo="Dicionário de profissões" detalhe="O que cada profissão faz, com atividades, ferramentas e rotina." />
        <AtalhoParaRecurso to="/objetivos" icone={Compass} titulo="O que você quer fazer?" detalhe="Caminhos guiados, só com os passos de que você precisa." />
        <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Mic className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="text-foreground">Comandos de voz:</strong> abra “Ajuda de leitura” (botão no canto da tela) e escolha “Falar um comando”. O microfone só liga quando você pede.
          </span>
        </p>
      </div>
    </section>
  );
}
