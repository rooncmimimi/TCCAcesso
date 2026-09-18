/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockCapturarErro = jest.fn();

jest.mock("../sentry", () => ({
  capturarErro: (...a: unknown[]) => mockCapturarErro(...a),
}));

import { act, fireEvent, render } from "@testing-library/react-native";
import { AccessibilityInfo, Text } from "react-native";

import { ErrorBoundary } from "../ErrorBoundary";

/** Lança na primeira renderização (não num evento): o único jeito de exercitar `componentDidCatch` de verdade. */
function ComponenteQuebrado(): never {
  throw new Error("Falha de teste proposital.");
}

// Erros de render lançados de propósito neste arquivo aparecem no console
// (comportamento do próprio React em desenvolvimento): silenciado só aqui,
// não afeta os outros arquivos de teste.
let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("ErrorBoundary", () => {
  it("sem erro, renderiza os filhos normalmente", async () => {
    const { getByText } = await render(
      <ErrorBoundary>
        <Text>Conteúdo normal</Text>
      </ErrorBoundary>,
    );

    expect(getByText("Conteúdo normal")).toBeTruthy();
  });

  it("quando um filho lança na renderização, mostra a tela de erro em vez de derrubar o app", async () => {
    const { getByText, queryByText } = await render(
      <ErrorBoundary>
        <ComponenteQuebrado />
      </ErrorBoundary>,
    );

    expect(getByText("Algo deu errado")).toBeTruthy();
    expect(queryByText("Conteúdo normal")).toBeNull();
  });

  it("reporta o erro capturado via capturarErro (observabilidade)", async () => {
    await render(
      <ErrorBoundary>
        <ComponenteQuebrado />
      </ErrorBoundary>,
    );

    expect(mockCapturarErro).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Falha de teste proposital." }),
      expect.any(Object),
    );
  });

  it("anuncia o erro para o leitor de tela uma única vez quando a tela de erro monta", async () => {
    const anunciar = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

    const { rerender } = await render(
      <ErrorBoundary>
        <ComponenteQuebrado />
      </ErrorBoundary>,
    );

    expect(anunciar).toHaveBeenCalledTimes(1);
    expect(anunciar).toHaveBeenCalledWith("Ocorreu um erro inesperado. Você pode tentar novamente.");

    // Um re-render da própria tela de erro (sem um novo erro acontecer) não
    // deve repetir o anúncio: `componentDidCatch` só roda de novo se um
    // filho lançar de novo.
    await act(async () => {
      rerender(
        <ErrorBoundary>
          <ComponenteQuebrado />
        </ErrorBoundary>,
      );
    });

    expect(anunciar).toHaveBeenCalledTimes(1);
  });

  it("'Tentar novamente' permite renderizar os filhos de novo (se o problema não se repetir)", async () => {
    let deveQuebrar = true;
    function ComponenteCondicional() {
      if (deveQuebrar) throw new Error("Falha de teste proposital.");
      return <Text>Recuperado</Text>;
    }

    const { getByText, rerender } = await render(
      <ErrorBoundary>
        <ComponenteCondicional />
      </ErrorBoundary>,
    );
    expect(getByText("Algo deu errado")).toBeTruthy();

    deveQuebrar = false;
    await act(async () => {
      fireEvent.press(getByText("Tentar novamente"));
    });
    await act(async () => {
      rerender(
        <ErrorBoundary>
          <ComponenteCondicional />
        </ErrorBoundary>,
      );
    });

    expect(getByText("Recuperado")).toBeTruthy();
  });
});
