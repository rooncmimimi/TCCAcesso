import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { horaDoVencimento, minutosQueFaltam, situacaoDoPrazo } from "@/lib/prazoDoCodigo";
import { useIdioma } from "@/hooks/useIdioma";

type Props = {
  /** Instante (ms) em que o código foi enviado. */
  enviadoEm: number;
  /** Pede outro código; o anterior deixa de valer. */
  aoPedirMaisTempo: () => void;
  /** Falso enquanto o servidor ainda não aceita outro pedido (a espera entre envios). */
  podePedir: boolean;
  /** Uma ação em andamento (enviar, reenviar) que não deve ser atropelada. */
  ocupado?: boolean;
};

/**
 * Prazo do código, em linguagem direta. Mostra *até que horas* o código vale e não corre uma
 * contagem regressiva; só quando faltam poucos minutos (ou quando venceu) aparece o aviso, anunciado
 * uma vez por leitores de tela, junto de "Preciso de mais tempo", que pede um código novo.
 */
export function PrazoDoCodigo({ enviadoEm, aoPedirMaisTempo, podePedir, ocupado = false }: Props) {
  const { t } = useIdioma();
  const [agora, setAgora] = useState(() => Date.now());

  // Confere a cada 15 s e para quando o código vence. Um código novo (outro `enviadoEm`) recomeça a conta.
  useEffect(() => {
    setAgora(Date.now());
    const id = window.setInterval(() => {
      const agoraReal = Date.now();
      setAgora(agoraReal);
      if (situacaoDoPrazo(enviadoEm, agoraReal) === "venceu") window.clearInterval(id);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [enviadoEm]);

  const situacao = situacaoDoPrazo(enviadoEm, agora);
  const locale = typeof document !== "undefined" ? document.documentElement.lang : "";
  const hora = horaDoVencimento(enviadoEm, locale);
  const faltam = minutosQueFaltam(enviadoEm, agora);

  return (
    <div className="rounded-xl border bg-muted/40 p-3 text-sm" data-situacao-prazo={situacao}>
      <p className="flex items-start gap-2">
        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>{situacao === "venceu" ? `Este código venceu às ${hora}.` : `Este código vale até às ${hora}.`}</span>
      </p>

      {/* Anunciado uma vez: o texto só muda ao entrar em "acabando" e ao vencer, não a cada checagem. */}
      <div role="status" className={situacao === "folga" ? "sr-only" : "mt-2"}>
        {situacao === "acabando" ? (
          <p className="font-medium">
            {faltam <= 1 ? "Falta menos de 1 minuto" : `Faltam cerca de ${faltam} minutos`} para o código vencer. Se precisar de mais tempo, peça outro código.
          </p>
        ) : null}
        {situacao === "venceu" ? <p className="font-medium">{t("acessibilidade.prazoDoCodigo.oCodigoVenceuPecaOutroPara")}</p> : null}
      </div>

      {situacao !== "folga" ? (
        <Button type="button" variant="outline" className="mt-2 h-auto min-h-11 w-full whitespace-normal py-2 text-center sm:w-auto" onClick={aoPedirMaisTempo} disabled={!podePedir || ocupado}>
          Preciso de mais tempo: enviar outro código
        </Button>
      ) : null}
      {situacao !== "folga" && !podePedir ? <p className="mt-1 text-xs text-muted-foreground">{t("acessibilidade.prazoDoCodigo.oBotaoLiberaEmInstantesO")}</p> : null}
    </div>
  );
}
