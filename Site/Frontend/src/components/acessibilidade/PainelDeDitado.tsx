import { useEffect, useId, useMemo, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDitado } from "@/hooks/useDitado";
import { useEstadoDoMicrofone } from "@/hooks/useEstadoDoMicrofone";
import { comoLiberarOMicrofone } from "@/lib/microfone";
import { aplicarSugestao, sugerirCorrecoes } from "@/lib/vocabularioContextual";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * O ditado em si: botão de ditar, indicador de microfone, área de revisão com as correções sugeridas
 * pelo vocabulário do ACESSO e o botão "Inserir no campo". O texto reconhecido NUNCA entra sozinho:
 * só quando a pessoa o revisa e confirma. Quem usa decide onde o texto entra (`aoInserir`).
 */
export function PainelDeDitado({ aoInserir }: { aoInserir: (texto: string) => void }) {
  const { t } = useIdioma();
  const idBase = useId();
  const ditado = useDitado();
  const microfone = useEstadoDoMicrofone();
  const [revisao, setRevisao] = useState<string | null>(null);
  const [ignoradas, setIgnoradas] = useState<string[]>([]);
  const { ouvindo, final, limpar } = ditado;

  // Quando a escuta termina e há texto reconhecido, abre a revisão (nunca insere direto).
  useEffect(() => {
    const texto = final.trim();

    if (ouvindo || !texto) return;

    setRevisao(texto);
    setIgnoradas([]);
    limpar();
  }, [ouvindo, final, limpar]);

  const sugestoes = useMemo(
    () => (revisao ? sugerirCorrecoes(revisao).filter((s) => !ignoradas.includes(`${s.inicio}:${s.sugestao}`)) : []),
    [revisao, ignoradas],
  );

  function inserir() {
    if (revisao === null) return;

    aoInserir(revisao);
    setRevisao(null);
  }

  return (
    <>
      {ditado.suportado ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2" aria-pressed={ditado.ouvindo} onClick={ditado.ouvindo ? ditado.parar : ditado.iniciar}>
              {ditado.ouvindo ? <MicOff className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
              {ditado.ouvindo ? "Parar ditado" : t("acessibilidade.painelDeDitado.ditarTexto")}
            </Button>

            <p role="status" className="text-sm font-semibold text-primary">
              {ditado.ouvindo ? (
                <>
                  <span aria-hidden="true" className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-destructive align-middle" />
                  {t("acessibilidade.painelDeDitado.microfoneLigado")}
                </>
              ) : null}
            </p>
          </div>

          {/*
            O que já foi ouvido, enquanto a pessoa fala. A escuta atravessa as pausas, então sem isto ela
            falaria frases seguidas sem ver nada acontecer e pensaria que o microfone morreu. Não é uma
            região "ao vivo" de propósito: um leitor de tela repetindo o texto inteiro a cada frase
            atrapalharia mais do que ajuda — o texto é lido na revisão, ao parar.
          */}
          {ditado.ouvindo && (ditado.final || ditado.parcial) ? (
            <p className="text-sm">
              <span className="font-semibold">{t("acessibilidade.painelDeDitado.jaOuvimos")}</span> {ditado.final}
              {ditado.parcial ? <span className="italic text-muted-foreground"> {ditado.parcial}</span> : null}
            </p>
          ) : null}

          {ditado.erro ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {ditado.erro}
            </p>
          ) : null}

          {microfone === "negado" && !ditado.ouvindo ? (
            <p role="status" className="rounded-md border-2 border-destructive/60 p-2 text-sm font-medium">
              {t("acessibilidade.painelDeDitado.microfoneBloqueado")} {comoLiberarOMicrofone()}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            {t("acessibilidade.painelDeDitado.microfoneContinuaLigado")}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("acessibilidade.painelDeDitado.esteNavegadorNaoOfereceDitado")}</p>
      )}

      {revisao !== null ? (
        <section aria-labelledby={`${idBase}-revisao`} className="space-y-3 rounded-lg border-2 border-primary/50 p-3">
          <h3 id={`${idBase}-revisao`} className="text-sm font-bold">
            {t("acessibilidade.painelDeDitado.reviseOQueFoiOuvido")}
          </h3>
          <div className="space-y-1">
            <Label htmlFor={`${idBase}-texto`} className="text-xs font-normal text-muted-foreground">
              {t("acessibilidade.painelDeDitado.vocePodeCorrigirOTextoAntesDe")}
            </Label>
            <Textarea id={`${idBase}-texto`} rows={3} value={revisao} onChange={(e) => setRevisao(e.target.value)} />
          </div>

          {sugestoes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t("acessibilidade.painelDeDitado.sugestoesDoAcessoVoceDecide")}</p>
              <ul className="space-y-2">
                {sugestoes.map((s) => (
                  <li key={`${s.inicio}:${s.sugestao}`} className="flex flex-wrap items-center gap-2 text-sm">
                    <span>
                      Trocar “<strong>{s.trecho}</strong>{t("acessibilidade.painelDeDitado.por")}<strong>{s.sugestao}</strong>”? <span className="text-muted-foreground">{s.motivo}</span>
                    </span>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setRevisao((atual) => (atual === null ? atual : aplicarSugestao(atual, s)))}>
                      {t("acessibilidade.painelDeDitado.aceitar")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIgnoradas((atuais) => [...atuais, `${s.inicio}:${s.sugestao}`])}>
                      {t("acessibilidade.painelDeDitado.manterComoEsta")}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={inserir} disabled={!revisao.trim()}>
              {t("acessibilidade.painelDeDitado.inserirNoCampo")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRevisao(null)}>
              {t("acessibilidade.painelDeDitado.descartar")}
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
}
