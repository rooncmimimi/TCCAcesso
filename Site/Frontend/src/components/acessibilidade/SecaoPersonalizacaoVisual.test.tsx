import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { PREFERENCIAS_PADRAO, type PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * A seção de personalização visual. O que importa aqui: dá para escolher um padrão pelo teclado,
 * o escolhido não se anuncia só pela cor, o contraste de cada cor aparece escrito, e restaurar
 * desfaz a personalização sem levar junto as outras preferências.
 */

const { estado } = vi.hoisted(() => ({
  estado: { prefs: null as unknown as PreferenciasAcessibilidade, definir: vi.fn() },
}));

vi.mock("@/hooks/useAcessibilidade", () => ({
  useAcessibilidade: () => ({
    preferencias: estado.prefs,
    rascunho: estado.prefs,
    definir: estado.definir,
    salvar: vi.fn(),
    descartar: vi.fn(),
    restaurar: vi.fn(),
  }),
}));

const { SecaoPersonalizacaoVisual } = await import("./SecaoPersonalizacaoVisual");

beforeEach(() => {
  vi.clearAllMocks();
  estado.prefs = { ...PREFERENCIAS_PADRAO };
  // `definir` de mentira que guarda, para o teste ver a preferência mudando.
  estado.definir.mockImplementation((chave: string, valor: unknown) => {
    estado.prefs = { ...estado.prefs, [chave]: valor } as PreferenciasAcessibilidade;
  });
});

afterEach(cleanup);

describe("escolher um padrão", () => {
  it("oferece os seis pontos de partida como opções de verdade (radio)", () => {
    render(<SecaoPersonalizacaoVisual />);

    const grupo = screen.getByRole("radiogroup", { name: /Escolha um ponto de partida/i });

    expect(within(grupo).getAllByRole("radio")).toHaveLength(6);
    expect(within(grupo).getByRole("radio", { name: /Cores do ACESSO/i })).toBeChecked();
  });

  it("cada opção diz o nome, o que faz e por que existe", () => {
    render(<SecaoPersonalizacaoVisual />);

    const opcao = screen.getByRole("radio", { name: /Protanopia/i });

    expect(opcao).toHaveAccessibleName(/vermelho mais escuro/i);
    expect(opcao).toHaveAccessibleDescription(/magenta/i);
  });

  it("escolher uma opção troca o padrão na hora", () => {
    render(<SecaoPersonalizacaoVisual />);

    fireEvent.click(screen.getByRole("radio", { name: /Deuteranopia/i }));

    expect(estado.definir).toHaveBeenCalledWith("visualPattern", "deuteranopia");
  });

  it("o escolhido não se anuncia só pela cor da borda: tem a palavra 'Escolhido'", () => {
    estado.prefs = { ...PREFERENCIAS_PADRAO, visualPattern: "tritanopia" };
    render(<SecaoPersonalizacaoVisual />);

    expect(screen.getByText("Escolhido")).toBeInTheDocument();
  });

  it("as amostras de cor são enfeite: ficam fora do leitor de tela", () => {
    const { container } = render(<SecaoPersonalizacaoVisual />);

    const amostras = container.querySelectorAll('[aria-hidden="true"] > span.rounded');

    expect(amostras.length).toBeGreaterThan(0);
  });
});

describe("ajuste fino", () => {
  it("os quatro controles existem e dizem o valor atual", () => {
    render(<SecaoPersonalizacaoVisual />);

    for (const nome of [/Intensidade da adaptação/i, /Saturação das cores/i, /Brilho das cores/i]) {
      expect(screen.getByRole("slider", { name: nome })).toHaveAttribute("aria-valuenow", "100");
    }

    expect(screen.getByLabelText(/Contraste mínimo do texto/i)).toHaveValue("4.5");
  });

  it("o controle anda pelo teclado, e o passo é de 5", () => {
    render(<SecaoPersonalizacaoVisual />);

    fireEvent.keyDown(screen.getByRole("slider", { name: /Saturação das cores/i }), { key: "ArrowRight" });

    expect(estado.definir).toHaveBeenCalledWith("visualSaturation", 105);
  });

  it("o contraste mínimo vira número, não texto", () => {
    render(<SecaoPersonalizacaoVisual />);

    fireEvent.change(screen.getByLabelText(/Contraste mínimo do texto/i), { target: { value: "7" } });

    expect(estado.definir).toHaveBeenCalledWith("visualContrast", 7);
  });

  it("diz que é preferência visual, e não correção da visão", () => {
    render(<SecaoPersonalizacaoVisual />);

    expect(screen.getByText(/não corrigem a visão de ninguém/i)).toBeInTheDocument();
  });
});

describe("cores por significado", () => {
  it("mostra os cinco significados com o contraste de cada um escrito", () => {
    const { container } = render(<SecaoPersonalizacaoVisual />);

    for (const papel of ["destaque", "sucesso", "erro", "alerta", "info"]) {
      expect(container.querySelector(`#visual-cor-${papel}`), papel).toBeInTheDocument();
    }

    expect(screen.getAllByText(/com o texto/i).length).toBe(5);
  });

  it("escolher uma cor guarda só aquele significado", () => {
    const { container } = render(<SecaoPersonalizacaoVisual />);

    fireEvent.change(container.querySelector("#visual-cor-sucesso")!, { target: { value: "#123456" } });

    expect(estado.definir).toHaveBeenCalledWith("visualColors", { sucesso: "#123456" });
  });

  it("'Voltar ao padrão' só aparece no significado que foi mexido", () => {
    estado.prefs = { ...PREFERENCIAS_PADRAO, visualColors: { erro: "#123456" } };
    render(<SecaoPersonalizacaoVisual />);

    expect(screen.getAllByRole("button", { name: /Voltar ao padrão/i })).toHaveLength(1);
  });

  it("voltar ao padrão tira a cor escolhida sem apagar as outras", () => {
    estado.prefs = { ...PREFERENCIAS_PADRAO, visualColors: { erro: "#123456", info: "#654321" } };
    render(<SecaoPersonalizacaoVisual />);

    fireEvent.click(screen.getAllByRole("button", { name: /Voltar ao padrão/i })[0]);

    expect(estado.definir).toHaveBeenCalledWith("visualColors", { info: "#654321" });
  });
});

describe("restaurar", () => {
  it("desfaz só a personalização visual", () => {
    estado.prefs = {
      ...PREFERENCIAS_PADRAO,
      visualPattern: "monocromatico",
      visualSaturation: 20,
      visualColors: { erro: "#123456" },
    };
    render(<SecaoPersonalizacaoVisual />);

    fireEvent.click(screen.getByRole("button", { name: /Restaurar a personalização visual/i }));

    expect(estado.definir).toHaveBeenCalledWith("visualPattern", "nenhum");
    expect(estado.definir).toHaveBeenCalledWith("visualSaturation", 100);
    expect(estado.definir).toHaveBeenCalledWith("visualColors", {});
    // Não encosta no que não é desta seção.
    expect(estado.definir).not.toHaveBeenCalledWith("darkMode", expect.anything());
    expect(estado.definir).not.toHaveBeenCalledWith("fontScale", expect.anything());
  });

  it("avisa que nada foi salvo ainda", () => {
    render(<SecaoPersonalizacaoVisual />);

    expect(screen.getByText(/só ficam guardadas quando você salvar/i)).toBeInTheDocument();
  });
});

describe("axe", () => {
  it("não deixa violação na seção inteira", async () => {
    const { container } = render(<SecaoPersonalizacaoVisual />);

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});
