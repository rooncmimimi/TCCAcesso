import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { PREFERENCIAS_PADRAO } from "./AcessibilidadeContext";
import { AcessibilidadeProvider } from "./AcessibilidadeProvider";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";

/**
 * O padrão visual vira variáveis de cor na raiz do documento, ao vivo e sem salvar — e volta atrás
 * inteiro quando a pessoa escolhe "nenhum". A sobra de uma variável antiga seria pior do que não
 * ter o recurso: a tela ficaria metade num padrão e metade noutro.
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
  raiz.removeAttribute("data-padrao-visual");
});

describe("padrão visual no documento", () => {
  it("começa em 'nenhum': nenhuma cor da marca é tocada", async () => {
    await montar();

    expect(PREFERENCIAS_PADRAO.visualPattern).toBe("nenhum");
    expect(raiz.getAttribute("data-padrao-visual")).toBe("nenhum");
    expect(raiz.style.getPropertyValue("--success")).toBe("");
    expect(raiz.style.getPropertyValue("--destructive")).toBe("");
  });

  it("escolher um padrão escreve as cores dos estados na hora, sem salvar", async () => {
    const { result } = await montar();

    act(() => result.current.definir("visualPattern", "acessivel"));

    expect(raiz.getAttribute("data-padrao-visual")).toBe("acessivel");
    expect(raiz.style.getPropertyValue("--success")).toBe("#0072b2");
    expect(raiz.style.getPropertyValue("--destructive")).toBe("#c14300");
    expect(raiz.style.getPropertyValue("--info")).toBe("#7b3f8f");
    // Pré-visualização: nada foi gravado ainda.
    expect(window.localStorage.getItem("acesso:a11y-prefs")).toBeNull();
  });

  it("o tema escuro usa a paleta escura do mesmo padrão", async () => {
    const { result } = await montar();

    act(() => {
      result.current.definir("visualPattern", "acessivel");
      result.current.definir("darkMode", true);
    });

    expect(raiz.style.getPropertyValue("--success")).toBe("#56b4e9");
    expect(raiz.style.getPropertyValue("--success-foreground")).toBe("#121212");
  });

  it("voltar para 'nenhum' apaga TODAS as variáveis, sem deixar sobra", async () => {
    const { result } = await montar();

    act(() => result.current.definir("visualPattern", "monocromatico"));
    expect(raiz.style.getPropertyValue("--primary")).toBe("#334155");

    act(() => result.current.definir("visualPattern", "nenhum"));

    for (const nome of ["--success", "--destructive", "--warning", "--info", "--primary", "--ring"]) {
      expect(raiz.style.getPropertyValue(nome), nome).toBe("");
    }
  });

  it("trocar de padrão não deixa a cor de destaque do anterior para trás", async () => {
    const { result } = await montar();

    // O monocromático mexe em `--primary`; o acessível não. Trocar um pelo outro tem de limpar.
    act(() => result.current.definir("visualPattern", "monocromatico"));
    act(() => result.current.definir("visualPattern", "acessivel"));

    expect(raiz.style.getPropertyValue("--primary")).toBe("");
    expect(raiz.style.getPropertyValue("--success")).toBe("#0072b2");
  });

  it("o padrão escolhido sobrevive ao salvar e voltar", async () => {
    const primeira = await montar();

    act(() => primeira.result.current.definir("visualPattern", "tritanopia"));
    act(() => primeira.result.current.salvar());
    primeira.unmount();

    const segunda = await montar();

    expect(segunda.result.current.preferencias.visualPattern).toBe("tritanopia");
    expect(raiz.style.getPropertyValue("--success")).toBe("#16772f");
  });

  it("um padrão inventado no localStorage volta para 'nenhum'", async () => {
    window.localStorage.setItem(
      "acesso:a11y-prefs",
      JSON.stringify({ ...PREFERENCIAS_PADRAO, visualPattern: "javascript:alert(1)" }),
    );

    const { result } = await montar();

    expect(result.current.preferencias.visualPattern).toBe("nenhum");
    expect(raiz.style.getPropertyValue("--success")).toBe("");
  });

  it("descartar a pré-visualização devolve o padrão que estava salvo", async () => {
    const { result } = await montar();

    act(() => result.current.definir("visualPattern", "deuteranopia"));
    act(() => result.current.salvar());
    act(() => result.current.definir("visualPattern", "monocromatico"));
    expect(raiz.style.getPropertyValue("--success")).toBe("#334155");

    act(() => result.current.descartar());

    expect(result.current.preferencias.visualPattern).toBe("deuteranopia");
    expect(raiz.style.getPropertyValue("--success")).toBe("#0072b2");
  });
});
