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
  const [escolha, setChoiceState] = useState<EscolhaVoz>(null);
  const [perguntouNestaSessao, setAsked] = useState(false);
  const velocidadeRef = useRef(preferencias.speechRate);
  const preferenciasRef = useRef(preferencias);

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
    setFalando(false);
  }, []);

  const falar = useCallback<VozContextValue["falar"]>((text, opts) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const textoLimpo = text.trim();
    if (!textoLimpo) return;
    if (opts?.interrupt !== false) window.speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(textoLimpo);
    fala.lang = "pt-BR";
    fala.rate = velocidadeRef.current;
    fala.onstart = () => setFalando(true);
    fala.onend = () => setFalando(false);
    fala.onerror = () => setFalando(false);
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
    () => ({ suportado, falando, escolha, perguntouNestaSessao, falar, parar, definirEscolha, limparEscolha }),
    [suportado, falando, escolha, perguntouNestaSessao, falar, parar, definirEscolha, limparEscolha],
  );

  return <VozContext.Provider value={valorContexto}>{children}</VozContext.Provider>;
}
