import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { PREFERENCIAS_PADRAO } from "./AcessibilidadeContext";
import { AcessibilidadeProvider } from "./AcessibilidadeProvider";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";

/**
 * Os modos do Bloco 1 (foco, leitura, daltonismo, cores personalizadas) viram classes e variáveis
 * na raiz do documento, ao vivo, e nada que não seja `#rrggbb` chega ao CSS.
 */

const raiz = document.documentElement;

function wrapper({ children }: { children: ReactNode }) {
  return <AcessibilidadeProvider>{children}</AcessibilidadeProvider>;
}

async function montar() {
  const hook = renderHook(() => useAcessibilidade(), { wrapper });
  await waitFor(() => expect(hook.result.current.inicializado).toBe(true));
  return hook;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  raiz.className = "";
  raiz.removeAttribute("style");
  raiz.removeAttribute("data-reading-bg");
  raiz.removeAttribute("data-reading-font");
});

describe("preferências padrão do Bloco 1", () => {
  it("só o destaque por palavra vem ligado; os modos que mudam a tela começam desligados", () => {
    expect(PREFERENCIAS_PADRAO).toMatchObject({
      wordHighlight: true,
      readingRuler: false,
      persistentToasts: false,
      focusMode: false,
      readingMode: false,
      customColors: false,
      colorBlind: false,
    });
  });

  it("as cores padrão já são legíveis entre si", async () => {
    const { razaoDeContraste } = await import("@/lib/contraste");
    const p = PREFERENCIAS_PADRAO;

    expect(razaoDeContraste(p.colorText, p.colorBg)).toBeGreaterThanOrEqual(7);
    expect(razaoDeContraste(p.colorLink, p.colorBg)).toBeGreaterThanOrEqual(4.5);
    expect(razaoDeContraste(p.colorFocus, p.colorBg)).toBeGreaterThanOrEqual(3);
  });
});

describe("modos aplicados no documento", () => {
  it.each([
    ["focusMode", "a11y-focus-mode"],
    ["readingMode", "a11y-reading-mode"],
    ["colorBlind", "a11y-colorblind"],
  ] as const)("%s liga e desliga a classe %s na hora", async (chave, classe) => {
    const { result } = await montar();
    expect(raiz.classList.contains(classe)).toBe(false);

    act(() => result.current.definir(chave, true));
    expect(raiz.classList.contains(classe)).toBe(true);

    act(() => result.current.definir(chave, false));
    expect(raiz.classList.contains(classe)).toBe(false);
  });

  it("o fundo e a fonte do modo leitura vão para atributos da raiz", async () => {
    const { result } = await montar();
    expect(raiz.getAttribute("data-reading-bg")).toBe("padrao");

    act(() => result.current.definir("readingBg", "creme"));
    act(() => result.current.definir("readingFont", "serifada"));

    expect(raiz.getAttribute("data-reading-bg")).toBe("creme");
    expect(raiz.getAttribute("data-reading-font")).toBe("serifada");
  });
});

describe("cores personalizadas", () => {
  it("ligadas, publicam as quatro cores como variáveis CSS; desligadas, removem tudo", async () => {
    const { result } = await montar();

    act(() => {
      result.current.definir("colorText", "#112233");
      result.current.definir("colorBg", "#fefefe");
      result.current.definir("colorLink", "#0000aa");
      result.current.definir("colorFocus", "#aa0000");
      result.current.definir("customColors", true);
    });

    expect(raiz.classList.contains("a11y-custom-colors")).toBe(true);
    expect(raiz.style.getPropertyValue("--a11y-c-text")).toBe("#112233");
    expect(raiz.style.getPropertyValue("--a11y-c-bg")).toBe("#fefefe");
    expect(raiz.style.getPropertyValue("--a11y-c-link")).toBe("#0000aa");
    expect(raiz.style.getPropertyValue("--a11y-c-focus")).toBe("#aa0000");

    act(() => result.current.definir("customColors", false));

    expect(raiz.classList.contains("a11y-custom-colors")).toBe(false);
    expect(raiz.style.getPropertyValue("--a11y-c-text")).toBe("");
  });

  it.each([
    "red",
    "#abc",
    "url(https://exemplo.com/x.png)",
    "#000000; background: url(x)",
    "expression(alert(1))",
  ])("uma cor inválida (%s) desliga o modo em vez de virar CSS", async (invalida) => {
    const { result } = await montar();

    act(() => {
      result.current.definir("customColors", true);
      result.current.definir("colorLink", invalida);
    });

    expect(raiz.classList.contains("a11y-custom-colors")).toBe(false);
    expect(raiz.style.getPropertyValue("--a11y-c-link")).toBe("");
    expect(raiz.getAttribute("style") ?? "").not.toContain("url(");
  });

  it("preferência corrompida no localStorage não passa para o CSS", async () => {
    window.localStorage.setItem(
      "acesso:a11y-prefs",
      JSON.stringify({ customColors: true, colorText: "#000000", colorBg: "javascript:alert(1)", colorLink: "#0000ff", colorFocus: "#ff0000" }),
    );

    await montar();

    expect(raiz.classList.contains("a11y-custom-colors")).toBe(false);
    expect(raiz.style.getPropertyValue("--a11y-c-bg")).toBe("");
  });

  it("quem tinha preferências salvas antes do Bloco 1 ganha os padrões novos", async () => {
    window.localStorage.setItem("acesso:a11y-prefs", JSON.stringify({ highContrast: true }));

    const { result } = await montar();

    expect(result.current.preferencias.highContrast).toBe(true);
    expect(result.current.preferencias.wordHighlight).toBe(true);
    expect(result.current.preferencias.readingRuler).toBe(false);
  });
});
