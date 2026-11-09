import { useEffect, useRef, useState } from "react";

import { EVENTO_DE_CLIQUE_IGNORADO } from "@/hooks/useGuardaDeAcionamentos";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Aviso curto e visível de que um acionamento repetido foi ignorado pela proteção contra tremores,
 * para a pessoa não achar que o site travou. Some sozinho depois de um instante (não é um erro nem
 * uma informação que precise ser guardada) e é anunciado de forma educada para leitores de tela.
 */
export function AvisoDeCliqueIgnorado() {
  const { t } = useIdioma();
  const [visivel, setVisivel] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mostrar = () => {
      setVisivel(true);
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(() => setVisivel(false), 1800);
    };

    window.addEventListener(EVENTO_DE_CLIQUE_IGNORADO, mostrar);

    return () => {
      window.removeEventListener(EVENTO_DE_CLIQUE_IGNORADO, mostrar);
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-20 left-1/2 z-[60] -translate-x-1/2" data-varredura-ignorar>
      {visivel ? <p className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-lg">{t("acessibilidade.avisoDeCliqueIgnorado.toqueRepetidoIgnoradoPela")}</p> : null}
    </div>
  );
}
