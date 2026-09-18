import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  type PreferenciasAcessibilidade,
  PREFERENCIAS_PADRAO,
  type AcessibilidadeContextValue,
  CHAVE_ESCOLHA_VOZ,
  AcessibilidadeContext,
} from "@/contexts/AcessibilidadeContext";

const CHAVE_PREFERENCIAS = "acesso:a11y-prefs";

function lerPreferenciasSalvas(): PreferenciasAcessibilidade | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_PREFERENCIAS);
    if (!bruto) return null;
    return { ...PREFERENCIAS_PADRAO, ...(JSON.parse(bruto) as Partial<PreferenciasAcessibilidade>) };
  } catch {
    return null;
  }
}

function aplicarNoDocumento(p: PreferenciasAcessibilidade) {
  const raiz = document.documentElement;
  raiz.classList.toggle("dark", p.darkMode);
  raiz.classList.toggle("a11y-contrast", p.highContrast);
  raiz.classList.toggle("a11y-dyslexia", p.dyslexiaFont);
  raiz.classList.toggle("a11y-big-cursor", p.bigCursor);
  raiz.classList.toggle("a11y-reduce-motion", p.reduceMotion);
  raiz.classList.toggle("a11y-focus", p.focusHighlight);
  raiz.style.setProperty("--a11y-font-scale", String(p.fontScale));
  raiz.style.setProperty("--a11y-letter-spacing", `${p.letterSpacing}em`);
  raiz.style.setProperty("--a11y-line-height", String(p.lineHeight));
}

/**
 * Guarda as preferências salvas e o rascunho em pré-visualização. O rascunho é aplicado na hora no
 * documento (classes `dark` e `a11y-*` e variáveis CSS), e só `salvar` grava no localStorage.
 */
export function AcessibilidadeProvider({ children }: { children: ReactNode }) {
  const [salvas, setSalvas] = useState<PreferenciasAcessibilidade>(PREFERENCIAS_PADRAO);
  const [rascunho, setRascunho] = useState<PreferenciasAcessibilidade>(PREFERENCIAS_PADRAO);
  const [inicializado, setInicializado] = useState(false);
  const rascunhoRef = useRef<PreferenciasAcessibilidade>(PREFERENCIAS_PADRAO);

  rascunhoRef.current = rascunho;

  useEffect(() => {
    const salvo = lerPreferenciasSalvas() ?? PREFERENCIAS_PADRAO;
    setSalvas(salvo);
    setRascunho(salvo);
    setInicializado(true);
  }, []);

  // Pré-visualização em tempo real: o rascunho é sempre o que está na tela.
  useEffect(() => {
    if (!inicializado) return;
    aplicarNoDocumento(rascunho);
  }, [rascunho, inicializado]);

  const definir = useCallback<AcessibilidadeContextValue["definir"]>((chave, valor) => {
    setRascunho((anterior) => ({ ...anterior, [chave]: valor }));
  }, []);

  // `next` permite salvar um valor recém-definido sem esperar o próximo render.
  const salvar = useCallback<AcessibilidadeContextValue["salvar"]>((next) => {
    const valor = next ?? rascunhoRef.current;
    rascunhoRef.current = valor;
    setRascunho(valor);
    setSalvas(valor);
    try {
      window.localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(valor));
    } catch {
      /* Sem espaço ou em modo privado, a preferência vale só na memória. */
    }
  }, []);

  const descartar = useCallback(() => setRascunho(salvas), [salvas]);

  const restaurar = useCallback(() => {
    setRascunho(PREFERENCIAS_PADRAO);
    setSalvas(PREFERENCIAS_PADRAO);
    try {
      window.localStorage.removeItem(CHAVE_PREFERENCIAS);
      window.localStorage.removeItem(CHAVE_ESCOLHA_VOZ);
    } catch {
      /* Sem acesso ao localStorage, não há o que limpar. */
    }
  }, []);

  const valorContexto = useMemo<AcessibilidadeContextValue>(
    () => ({
      preferencias: rascunho,
      rascunho,
      inicializado,
      alterado: JSON.stringify(rascunho) !== JSON.stringify(salvas),
      definir,
      salvar,
      descartar,
      restaurar,
    }),
    [rascunho, salvas, inicializado, definir, salvar, descartar, restaurar],
  );

  return (
    <AcessibilidadeContext.Provider value={valorContexto}>{children}</AcessibilidadeContext.Provider>
  );
}
