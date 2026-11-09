import { useCallback, useEffect, useRef, useState } from "react";

import {
  calarVozDoSite,
  construtor,
  FIM_DEFINITIVO,
  idiomaDeEscuta,
  MENSAGENS_DE_ERRO,
  NADA_FOI_OUVIDO,
  NAO_LIGOU,
  reconhecimentoDeFalaSuportado,
  soltarReconhecimento,
  type Reconhecimento,
} from "@/lib/microfone";

export const EVENTO_PEDIR_COMANDO_DE_VOZ = "acesso:comando-de-voz";

/** Pede para o ACESSO começar a ouvir UM comando (de qualquer lugar: menu de ajuda, atalho). */
export function pedirComandoDeVoz() {
  window.dispatchEvent(new Event(EVENTO_PEDIR_COMANDO_DE_VOZ));
}

/** Tempo máximo ouvindo um comando: o microfone nunca fica ligado esperando para sempre. */
export const LIMITE_DE_ESCUTA_MS = 10_000;

/**
 * Escuta UM comando de voz e para. Só começa quando `iniciar` é chamado (por um clique da pessoa); o
 * navegador pede a permissão do microfone. Não guarda áudio: só o texto da frase ouvida é entregue a
 * `aoOuvir`. Ver `lib/microfone` para o que o navegador faz com o áudio.
 *
 * Diferente do ditado, aqui **não** há recomeço automático: um comando é uma frase curta, e insistir
 * sozinho com o microfone aberto seria pior do que avisar. Mas vale o resto do cuidado: um erro nunca
 * deixa o estado preso em "ouvindo", uma escuta anterior pendurada não impede a próxima, o fim normal
 * (`aborted`) não vira mensagem de falha, e o silêncio é dito em vez de passar em branco.
 */
export function useComandoDeVoz(aoOuvir: (fala: string) => void) {
  const [suportado] = useState(reconhecimentoDeFalaSuportado);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const reconhecimento = useRef<Reconhecimento | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Veio alguma fala nesta escuta? É o que diferencia "entendi" de "não ouvi nada". */
  const ouviuRef = useRef(false);
  const aoOuvirRef = useRef(aoOuvir);

  useEffect(() => {
    aoOuvirRef.current = aoOuvir;
  }, [aoOuvir]);

  const limparRelogio = () => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  };

  const soltarSessao = () => {
    const atual = reconhecimento.current;

    reconhecimento.current = null;
    soltarReconhecimento(atual);
  };

  const parar = useCallback(() => {
    limparRelogio();

    const atual = reconhecimento.current;

    if (!atual) {
      setOuvindo(false);

      return;
    }

    try {
      atual.stop();
    } catch {
      // Sem conseguir parar pelo caminho normal, solta à força para não ficar preso em "ouvindo".
      soltarSessao();
      setOuvindo(false);
    }
  }, []);

  const iniciar = useCallback(() => {
    const Construtor = construtor();

    if (!Construtor) return;

    // Uma escuta anterior que o navegador não fechou não pode bloquear esta: antes, um erro sem `onend`
    // deixava a referência presa e todo clique seguinte em "Falar um comando" não fazia absolutamente nada.
    soltarSessao();
    limparRelogio();

    const r = new Construtor();

    r.lang = idiomaDeEscuta();
    r.continuous = false;
    r.interimResults = false;
    ouviuRef.current = false;

    r.onresult = (e) => {
      const ultimo = e.results[e.results.length - 1];
      const fala = ultimo?.[0]?.transcript?.trim();

      if (!fala) return;

      ouviuRef.current = true;
      aoOuvirRef.current(fala);
    };

    r.onerror = (e) => {
      // `aborted` é o fim normal (a pessoa apertou Parar, ou saiu da tela).
      if (e.error === "aborted") return;

      setErro(MENSAGENS_DE_ERRO[e.error] ?? "O reconhecimento de voz parou por um erro do navegador.");

      // Sem `onend` depois do erro (acontece em alguns navegadores), o microfone ficaria "ligado" para sempre.
      if (FIM_DEFINITIVO.has(e.error)) {
        reconhecimento.current = null;
        limparRelogio();
      }

      setOuvindo(false);
    };

    r.onend = () => {
      limparRelogio();
      reconhecimento.current = null;
      setOuvindo(false);

      // Nunca por cima de um erro já explicado (microfone negado, sem internet): esse é mais específico.
      if (!ouviuRef.current) setErro((atual) => atual ?? NADA_FOI_OUVIDO);
    };

    calarVozDoSite();
    setErro(null);
    reconhecimento.current = r;

    try {
      r.start();
      setOuvindo(true);
      relogio.current = setTimeout(parar, LIMITE_DE_ESCUTA_MS);
    } catch {
      reconhecimento.current = null;
      setOuvindo(false);
      setErro(NAO_LIGOU);
    }
  }, [parar]);

  useEffect(
    () => () => {
      limparRelogio();
      soltarSessao();
    },
    [],
  );

  return { suportado, ouvindo, erro, iniciar, parar };
}
