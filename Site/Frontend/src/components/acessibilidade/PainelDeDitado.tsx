import { useEffect, useId, useMemo, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDitado } from "@/hooks/useDitado";
import { aplicarSugestao, sugerirCorrecoes } from "@/lib/vocabularioContextual";

/**
 * O ditado em si: botão de ditar, indicador de microfone, área de revisão com as correções sugeridas
 * pelo vocabulário do ACESSO e o botão "Inserir no campo". O texto reconhecido NUNCA entra sozinho:
 * só quando a pessoa o revisa e confirma. Quem usa decide onde o texto entra (`aoInserir`).
 */
export function PainelDeDitado({ aoInserir }: { aoInserir: (texto: string) => void }) {
  const idBase = useId();
  const ditado = useDitado();
  const [revisao, setRevisao] = useState<string | null>(null);
  const [ignoradas, setIgnoradas] = useState<string[]>([]);

  // Quando a escuta termina e há texto reconhecido, abre a revisão (nunca insere direto).
  useEffect(() => {
    if (!ditado.ouvindo && ditado.final.trim()) {
      setRevisao(ditado.final.trim());
      setIgnoradas([]);
      ditado.limpar();
    }
  }, [ditado, ditado.ouvindo, ditado.final]);

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
              {ditado.ouvindo ? "Parar ditado" : "Ditar texto"}
            </Button>

            <p role="status" className="text-sm font-semibold text-primary">
              {ditado.ouvindo ? (
                <>
                  <span aria-hidden="true" className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-destructive align-middle" />
                  Microfone ligado
                </>
              ) : null}
            </p>
          </div>

          {ditado.ouvindo && ditado.parcial ? <p className="text-sm italic text-muted-foreground">Ouvindo: {ditado.parcial}</p> : null}
          {ditado.erro ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {ditado.erro}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            O ACESSO não grava áudio. Em navegadores como Chrome e Edge, quem reconhece a fala é um serviço online do próprio navegador, então o áudio pode sair do seu aparelho e é
            preciso internet.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Este navegador não oferece ditado dentro do site. Você pode usar o ditado do sistema: no Windows, tecle Windows + H; no celular, use o microfone do teclado.</p>
      )}

      {revisao !== null ? (
        <section aria-labelledby={`${idBase}-revisao`} className="space-y-3 rounded-lg border-2 border-primary/50 p-3">
          <h3 id={`${idBase}-revisao`} className="text-sm font-bold">
            Revise o que foi ouvido
          </h3>
          <div className="space-y-1">
            <Label htmlFor={`${idBase}-texto`} className="text-xs font-normal text-muted-foreground">
              Você pode corrigir o texto antes de usar. Nada foi colocado no campo ainda.
            </Label>
            <Textarea id={`${idBase}-texto`} rows={3} value={revisao} onChange={(e) => setRevisao(e.target.value)} />
          </div>

          {sugestoes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Sugestões do ACESSO (você decide):</p>
              <ul className="space-y-2">
                {sugestoes.map((s) => (
                  <li key={`${s.inicio}:${s.sugestao}`} className="flex flex-wrap items-center gap-2 text-sm">
                    <span>
                      Trocar “<strong>{s.trecho}</strong>” por “<strong>{s.sugestao}</strong>”? <span className="text-muted-foreground">{s.motivo}</span>
                    </span>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setRevisao((atual) => (atual === null ? atual : aplicarSugestao(atual, s)))}>
                      Aceitar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIgnoradas((atuais) => [...atuais, `${s.inicio}:${s.sugestao}`])}>
                      Manter como está
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={inserir} disabled={!revisao.trim()}>
              Inserir no campo
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRevisao(null)}>
              Descartar
            </Button>
          </div>
        </section>
      ) : null}
    </>
  );
}
