import { useEffect } from "react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { INTERVALO_DE_ENVIO_MS, REGISTRO_VAZIO, avaliarAcionamento, avaliarEnvio, controleAcionado, type RegistroDeAcionamento } from "@/lib/guardaDeAcionamentos";

export const EVENTO_DE_CLIQUE_IGNORADO = "acesso:clique-ignorado";

/**
 * Liga a proteção contra acionamentos repetidos no documento inteiro.
 *
 *  - **Envio de formulário:** sempre ligado, com um intervalo curto: enviar o mesmo formulário duas vezes
 *    em menos de meio segundo nunca é intenção de ninguém e duplicaria candidatura, mensagem ou publicação.
 *  - **Cliques:** só quando a pessoa ligou a "Proteção contra tremores", com o intervalo que escolheu.
 *
 * Os ouvintes ficam na fase de captura do `document`, antes do React, e só cancelam o acionamento repetido.
 */
export function useGuardaDeAcionamentos() {
  const { preferencias } = useAcessibilidade();
  const { tremorGuard, tremorDelay } = preferencias;

  useEffect(() => {
    let cliques: RegistroDeAcionamento = REGISTRO_VAZIO;
    let envios: RegistroDeAcionamento = REGISTRO_VAZIO;
    const intervaloDeEnvio = tremorGuard ? Math.max(INTERVALO_DE_ENVIO_MS, tremorDelay) : INTERVALO_DE_ENVIO_MS;

    const aoEnviar = (evento: Event) => {
      if (!(evento.target instanceof Element)) return;

      const resultado = avaliarEnvio(envios, evento.target, performance.now(), intervaloDeEnvio);

      envios = resultado.registro;

      if (resultado.ignorar) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        window.dispatchEvent(new Event(EVENTO_DE_CLIQUE_IGNORADO));
      }
    };

    const aoClicar = (evento: MouseEvent) => {
      const controle = controleAcionado(evento.target);

      if (!controle) return;

      const resultado = avaliarAcionamento(cliques, controle, performance.now(), tremorDelay);

      cliques = resultado.registro;

      if (resultado.ignorar) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        window.dispatchEvent(new Event(EVENTO_DE_CLIQUE_IGNORADO));
      }
    };

    document.addEventListener("submit", aoEnviar, true);
    if (tremorGuard) document.addEventListener("click", aoClicar, true);

    return () => {
      document.removeEventListener("submit", aoEnviar, true);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [tremorGuard, tremorDelay]);
}
