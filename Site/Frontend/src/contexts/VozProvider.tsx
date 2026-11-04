import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { CHAVE_ESCOLHA_VOZ } from "@/contexts/AcessibilidadeContext";
import { type EscolhaVoz, type VozContextValue, VozContext } from "@/contexts/VozContext";

/**
 * Leitura por voz com a Web Speech API do navegador (`speechSynthesis`), em português e na
 * velocidade escolhida nas preferências. Também guarda a escolha do primeiro acesso (ver
 * `VozContext.ts`).
 */
export function VozProvider({ children }: { children: ReactNode }) {
  const { preferencias, salvar } = useAcessibilidade();
  const [suportado, setSuportado] = useState(false);
  const [falando, setFalando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [escolha, setChoiceState] = useState<EscolhaVoz>(null);
  const [perguntouNestaSessao, setAsked] = useState(false);
  const velocidadeRef = useRef(preferencias.speechRate);
  const preferenciasRef = useRef(preferencias);
  /** Quantas falas ainda estão na fila do navegador: `falando` só vira falso quando zera. */
  const naFilaRef = useRef(0);
  /**
   * Muda a cada `cancel()`. Uma fala cancelada ainda recebe o próprio `error` depois de a fala nova
   * já ter entrado na fila; sem comparar a geração, esse aviso tardio zeraria a conta da fila e
   * `falando` ficaria falso com a fala nova a caminho.
   */
  const geracaoRef = useRef(0);

  velocidadeRef.current = preferencias.speechRate;
  preferenciasRef.current = preferencias;

  useEffect(() => {
    setSuportado(typeof window !== "undefined" && "speechSynthesis" in window);
    try {
      const salvo = window.localStorage.getItem(CHAVE_ESCOLHA_VOZ) as EscolhaVoz;
      if (salvo === "accepted" || salvo === "declined") {
        setChoiceState(salvo);
        setAsked(true);
      }
    } catch {
      /* Sem acesso ao localStorage (modo privado ou bloqueado), a escolha só não é restaurada. */
    }
  }, []);

  const parar = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    geracaoRef.current += 1;
    naFilaRef.current = 0;
    setFalando(false);
    setPausado(false);
  }, []);

  const pausar = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    setPausado(true);
  }, []);

  const retomar = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setPausado(false);
  }, []);

  const falar = useCallback<VozContextValue["falar"]>((text, opts) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const textoLimpo = text.trim();
    if (!textoLimpo) return;
    if (opts?.interrupt !== false) {
      window.speechSynthesis.cancel();
      geracaoRef.current += 1;
      naFilaRef.current = 0;
      setPausado(false);
    }

    const fala = new SpeechSynthesisUtterance(textoLimpo);
    fala.lang = "pt-BR";
    fala.rate = velocidadeRef.current;
    naFilaRef.current += 1;
    const minhaGeracao = geracaoRef.current;

    let encerrada = false;
    const encerrar = (motivo: "fim" | "erro" | "cancelada") => {
      // `end` e `error` podem chegar os dois para a mesma fala: conta uma vez só.
      if (encerrada) return;
      encerrada = true;
      // Fala de uma geração anterior (cancelada) não mexe na fila da atual.
      if (minhaGeracao === geracaoRef.current) {
        naFilaRef.current = Math.max(0, naFilaRef.current - 1);
        if (naFilaRef.current === 0) {
          setFalando(false);
          setPausado(false);
        }
      }
      opts?.aoTerminar?.(motivo);
    };

    fala.onstart = () => {
      setFalando(true);
      opts?.aoIniciar?.();
    };
    fala.onboundary = (evento) => {
      opts?.aoLimite?.({ charIndex: evento.charIndex, charLength: evento.charLength, name: evento.name });
    };
    fala.onend = () => encerrar("fim");
    fala.onerror = (evento) => {
      // `interrupted` e `canceled` são o nosso próprio `cancel()`, não uma falha.
      const cancelada = evento.error === "interrupted" || evento.error === "canceled";
      encerrar(cancelada ? "cancelada" : "erro");
    };
    window.speechSynthesis.speak(fala);
  }, []);

  const definirEscolha = useCallback<VozContextValue["definirEscolha"]>(
    (next) => {
      setChoiceState(next);
      setAsked(true);
      try {
        window.localStorage.setItem(CHAVE_ESCOLHA_VOZ, next);
      } catch {
        /* Sem acesso ao localStorage, a escolha vale só nesta sessão. */
      }
      // Grava na hora a decisão do primeiro acesso. `voiceConsent` registra a resposta em si (não
      // perguntar de novo), e `screenReader` é a preferência efetiva, que pode ser ligada e
      // desligada depois sem desfazer o consentimento. Os dois começam iguais porque é o mesmo
      // instante da decisão.
      salvar({ ...preferenciasRef.current, screenReader: next === "accepted", voiceConsent: next === "accepted" });
      if (next === "declined") parar();
    },
    [salvar, parar],
  );

  const limparEscolha = useCallback(() => {
    setChoiceState(null);
    setAsked(false);
    try {
      window.localStorage.removeItem(CHAVE_ESCOLHA_VOZ);
    } catch {
      /* Sem acesso ao localStorage, não há o que limpar. */
    }
  }, []);

  useEffect(() => parar, [parar]);

  const valorContexto = useMemo<VozContextValue>(
    () => ({
      suportado,
      falando,
      pausado,
      escolha,
      perguntouNestaSessao,
      falar,
      parar,
      pausar,
      retomar,
      definirEscolha,
      limparEscolha,
    }),
    [suportado, falando, pausado, escolha, perguntouNestaSessao, falar, parar, pausar, retomar, definirEscolha, limparEscolha],
  );

  return <VozContext.Provider value={valorContexto}>{children}</VozContext.Provider>;
}
