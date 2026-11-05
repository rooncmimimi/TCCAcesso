import { useCallback, useEffect, useRef, useState } from "react";

import { MENSAGENS_DE_ERRO, construtor, type Reconhecimento } from "@/hooks/useDitado";

export const EVENTO_PEDIR_COMANDO_DE_VOZ = "acesso:comando-de-voz";

/** Pede para o ACESSO começar a ouvir UM comando (de qualquer lugar: menu de ajuda, atalho). */
export function pedirComandoDeVoz() {
  window.dispatchEvent(new Event(EVENTO_PEDIR_COMANDO_DE_VOZ));
}

/** Tempo máximo ouvindo um comando: o microfone nunca fica ligado esperando para sempre. */
export const LIMITE_DE_ESCUTA_MS = 10_000;

/**
 * Escuta UM comando de voz e para. Só começa quando `iniciar` é chamado (por um clique da pessoa);
 * o navegador pede a permissão do microfone. Não guarda áudio: só o texto da frase ouvida é entregue
 * a `aoOuvir`. Em Chrome e Edge o próprio navegador envia o áudio a um serviço online para reconhecer,
 * então não funciona sem internet nesses navegadores (a tela avisa).
 */
export function useComandoDeVoz(aoOuvir: (fala: string) => void) {
  const [suportado] = useState(() => construtor() !== null);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aoOuvirRef = useRef(aoOuvir);

  aoOuvirRef.current = aoOuvir;

  const limparRelogio = () => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  };

  const parar = useCallback(() => {
    limparRelogio();
    reconhecimento.current?.stop();
  }, []);

  const iniciar = useCallback(() => {
    const Construtor = construtor();

    if (!Construtor || reconhecimento.current) return;

    const r = new Construtor();

    r.lang = (typeof document !== "undefined" && document.documentElement.lang) || "pt-BR";
    r.continuous = false;
    r.interimResults = false;

    r.onresult = (e) => {
      const ultimo = e.results[e.results.length - 1];
      const fala = ultimo?.[0]?.transcript?.trim();

      if (fala) aoOuvirRef.current(fala);
    };

    r.onerror = (e) => setErro(MENSAGENS_DE_ERRO[e.error] ?? "O reconhecimento de voz parou por um erro do navegador.");

    r.onend = () => {
      limparRelogio();
      reconhecimento.current = null;
      setOuvindo(false);
    };

    setErro(null);
    reconhecimento.current = r;

    try {
      r.start();
      setOuvindo(true);
      relogio.current = setTimeout(() => reconhecimento.current?.stop(), LIMITE_DE_ESCUTA_MS);
    } catch {
      reconhecimento.current = null;
      setErro("Não foi possível ligar o microfone agora.");
    }
  }, []);

  useEffect(
    () => () => {
      limparRelogio();

      const atual = reconhecimento.current;

      if (atual) {
        atual.onend = null;
        atual.abort();
        reconhecimento.current = null;
      }
    },
    [],
  );

  return { suportado, ouvindo, erro, iniciar, parar };
}
