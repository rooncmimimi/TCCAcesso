import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";

import { FiltrosDeCor, SeletorDeAjusteDeCor } from "./AjusteDeCorDaImagem";
import { AJUSTES, useAjusteDeCor } from "@/lib/ajusteDeCorDaImagem";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * O ajuste de cor de uma imagem só. O que os testes aqui protegem é a promessa, não a aparência:
 * nada acontece sozinho, nada toca no arquivo, e "Original" está sempre a um clique.
 */

afterEach(cleanup);

describe("useAjusteDeCor", () => {
  it("começa no original, sem filtro nenhum", () => {
    const { result } = renderHook(() => useAjusteDeCor());

    expect(result.current.ajuste).toBe("original");
    expect(result.current.estilo).toBeUndefined();
    expect(result.current.temFiltro).toBe(false);
  });

  it("escolher um ajuste devolve o filtro daquela instância", () => {
    const { result } = renderHook(() => useAjusteDeCor());

    act(() => result.current.setAjuste("protanopia"));

    expect(result.current.estilo?.filter).toBe(`url(#${result.current.prefixo}-protanopia)`);
    expect(result.current.temFiltro).toBe(true);
  });

  it("voltar ao original tira o filtro, sem deixar sobra", () => {
    const { result } = renderHook(() => useAjusteDeCor());

    act(() => result.current.setAjuste("cinza"));
    act(() => result.current.setAjuste("original"));

    expect(result.current.estilo).toBeUndefined();
  });

  it("dois ajustes na mesma tela não disputam o mesmo id", () => {
    const { result: um } = renderHook(() => useAjusteDeCor());
    const { result: outro } = renderHook(() => useAjusteDeCor());

    expect(um.current.prefixo).not.toBe(outro.current.prefixo);
  });
});

describe("FiltrosDeCor", () => {
  it("declara um filtro para cada ajuste que não é o original", () => {
    const { container } = render(<FiltrosDeCor prefixo="teste" />);

    const filtros = container.querySelectorAll("filter");

    expect(filtros).toHaveLength(AJUSTES.length - 1);
    expect(container.querySelector("#teste-protanopia")).toBeTruthy();
    expect(container.querySelector("#teste-original")).toBeNull();
  });

  it("o svg dos filtros fica fora do alcance do leitor de tela", () => {
    const { container } = render(<FiltrosDeCor prefixo="teste" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("as simulações usam matriz; mais cor e sem cor usam saturação", () => {
    const { container } = render(<FiltrosDeCor prefixo="teste" />);

    expect(container.querySelector("#teste-protanopia feColorMatrix")?.getAttribute("type")).toBe("matrix");
    expect(container.querySelector("#teste-cinza feColorMatrix")?.getAttribute("values")).toBe("0");
    expect(container.querySelector("#teste-saturar feColorMatrix")?.getAttribute("type")).toBe("saturate");
  });
});

describe("SeletorDeAjusteDeCor", () => {
  it("oferece o original e os cinco ajustes, com o original escolhido", () => {
    render(<SeletorDeAjusteDeCor valor="original" aoMudar={() => {}} />);

    const seletor = screen.getByLabelText(/Ver as cores desta imagem/i);

    expect(seletor).toHaveValue("original");
    expect(screen.getAllByRole("option")).toHaveLength(AJUSTES.length);
  });

  it("escolher avisa quem chamou", () => {
    let escolhido = "";
    render(<SeletorDeAjusteDeCor valor="original" aoMudar={(id) => (escolhido = id)} />);

    fireEvent.change(screen.getByLabelText(/Ver as cores desta imagem/i), {
      target: { value: "deuteranopia" },
    });

    expect(escolhido).toBe("deuteranopia");
  });

  it("axe não acha violação", async () => {
    const { container } = render(<SeletorDeAjusteDeCor valor="original" aoMudar={() => {}} />);

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});
