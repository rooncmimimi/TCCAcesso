import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

/**
 * O seletor de idioma e o que ele muda de fato nas telas: rótulo de verdade, nomes de cada idioma escritos nele mesmo, troca na hora,
 * e as telas (rodapé, cabeçalho de visitante) saindo no idioma escolhido.
 */

const { servico } = vi.hoisted(() => ({ servico: { obter: vi.fn(), salvar: vi.fn() } }));

vi.mock("@/services/acessibilidade.service", () => ({ acessibilidadeService: servico, default: servico }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...resto }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
}));

const { IdiomaProvider } = await import("@/contexts/IdiomaProvider");
const { SeletorDeIdioma } = await import("./SeletorDeIdioma");
const { SuporteRodape } = await import("./SuporteRodape");
const { CHAVE_IDIOMA } = await import("@/i18n/armazenamento");

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["pt-BR"]);
  servico.obter.mockResolvedValue({});
  // O Select (Radix) mede elementos que o jsdom não implementa.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SeletorDeIdioma", () => {
  it("tem rótulo de verdade (lido por leitor de tela) e mostra o idioma atual", () => {
    render(
      <IdiomaProvider>
        <SeletorDeIdioma />
      </IdiomaProvider>,
    );

    const controle = screen.getByRole("combobox", { name: "Escolher o idioma do site" });

    expect(controle).toHaveTextContent("Português");
  });

  it("lista os três idiomas, cada um escrito nele mesmo, e trocar muda o rótulo e guarda a escolha", async () => {
    render(
      <IdiomaProvider>
        <SeletorDeIdioma />
      </IdiomaProvider>,
    );

    fireEvent.click(screen.getByRole("combobox"));

    const lista = await screen.findByRole("listbox");
    expect(within(lista).getAllByRole("option").map((o) => o.textContent)).toEqual(["Português", "English", "Español"]);

    fireEvent.click(within(lista).getByRole("option", { name: "English" }));

    expect(await screen.findByRole("combobox", { name: "Choose the site language" })).toHaveTextContent("English");
    expect(window.localStorage.getItem(CHAVE_IDIOMA)).toBe("en");
    expect(document.documentElement.lang).toBe("en-US");
  });
});

describe("telas no idioma escolhido", () => {
  it.each([
    ["pt", "Precisa de ajuda?", "Termos de Uso"],
    ["en", "Need help?", "Terms of Use"],
    ["es", "¿Necesitas ayuda?", "Términos de uso"],
  ])("rodapé em %s", (idioma, ajuda, termos) => {
    window.localStorage.setItem(CHAVE_IDIOMA, idioma);

    render(
      <IdiomaProvider>
        <SuporteRodape />
      </IdiomaProvider>,
    );

    expect(screen.getByRole("heading", { name: ajuda })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: termos })).toBeInTheDocument();
  });

  it("sem provedor, o rodapé segue em português (os testes de tela de antes continuam valendo)", () => {
    render(<SuporteRodape />);

    expect(screen.getByRole("heading", { name: "Precisa de ajuda?" })).toBeInTheDocument();
  });
});
