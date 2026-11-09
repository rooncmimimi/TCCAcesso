import { useEffect, useState } from "react";

import { observarMicrofone, type EstadoDoMicrofone } from "@/lib/microfone";

/**
 * Como está a permissão do microfone, acompanhando as mudanças.
 *
 * A tela usa isso para avisar **antes** de a pessoa tentar falar. Microfone bloqueado no navegador é a
 * causa mais comum de "o ditado não funciona mesmo com internet e no navegador certo": o site pedia a
 * permissão, o navegador recusava calado e nada acontecia na tela.
 */
export function useEstadoDoMicrofone(): EstadoDoMicrofone {
  const [estado, setEstado] = useState<EstadoDoMicrofone>("desconhecido");

  useEffect(() => observarMicrofone(setEstado), []);

  return estado;
}
