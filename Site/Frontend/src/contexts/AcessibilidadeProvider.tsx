import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  type PreferenciasAcessibilidade,
  PREFERENCIAS_PADRAO,
  type AcessibilidadeContextValue,
  CHAVE_ESCOLHA_VOZ,
  AcessibilidadeContext,
} from "@/contexts/AcessibilidadeContext";
import { ehCorHex } from "@/lib/contraste";
import { VARIAVEIS_DOS_PADROES, variaveisDoPadrao } from "@/lib/padroesVisuais";
import { ajustesVisuais } from "@/lib/preferenciasVisuais";
import { normalizarPreferencias } from "@/lib/preferenciasMotoras";

const CHAVE_PREFERENCIAS = "acesso:a11y-prefs";

function lerPreferenciasSalvas(): PreferenciasAcessibilidade | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_PREFERENCIAS);
    if (!bruto) return null;
    return normalizarPreferencias(JSON.parse(bruto) as Partial<PreferenciasAcessibilidade>);
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

  raiz.classList.toggle("a11y-focus-mode", p.focusMode);
  raiz.classList.toggle("a11y-reading-mode", p.readingMode);
  // A classe liga o que não é cor: links sublinhados e o símbolo de reserva em quem não tem
  // ícone. Vale para QUALQUER padrão escolhido, e não só para o interruptor antigo.
  raiz.classList.toggle("a11y-colorblind", p.colorBlind || p.visualPattern !== "nenhum");

  // Padrão visual para daltonismo. As cores vão como variáveis NO ELEMENTO RAIZ, então vencem
  // qualquer bloco do `globals.css` — inclusive o de alto contraste. É de propósito: todas as
  // paletas medem no mínimo 4,5:1 com o seu texto nos dois temas (o teste refaz essa conta), e
  // quem escolheu um padrão escolheu para usar. O alto contraste continua mandando no fundo, no
  // texto e nas bordas, que o padrão não toca.
  raiz.setAttribute("data-padrao-visual", p.visualPattern);

  const coresDoPadrao = variaveisDoPadrao(p.visualPattern, p.darkMode, ajustesVisuais(p));

  for (const nome of VARIAVEIS_DOS_PADROES) {
    const valor = coresDoPadrao[nome];

    if (valor) raiz.style.setProperty(nome, valor);
    else raiz.style.removeProperty(nome);
  }
  raiz.setAttribute("data-target-size", p.targetSize);
  raiz.setAttribute("data-reading-bg", p.readingBg);
  raiz.setAttribute("data-reading-font", p.readingFont);

  // Cores à escolha: só vão para o CSS valores `#rrggbb` válidos. Um valor corrompido no
  // localStorage (ou vindo de fora) desliga o modo em vez de virar CSS arbitrário.
  const cores = { text: p.colorText, bg: p.colorBg, link: p.colorLink, focus: p.colorFocus };
  const coresValidas = Object.values(cores).every(ehCorHex);
  const ligarCores = p.customColors && coresValidas;
  raiz.classList.toggle("a11y-custom-colors", ligarCores);
  for (const [nome, valor] of Object.entries(cores)) {
    if (ligarCores) raiz.style.setProperty(`--a11y-c-${nome}`, valor);
    else raiz.style.removeProperty(`--a11y-c-${nome}`);
  }
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
