import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * A tela "Falta confirmar seu e-mail", que a empresa vê logo depois de criar a conta.
 *
 * Os quatro passos da lista eram escritos na tela como a CHAVE do texto, e a pessoa lia
 * "cadastro.comuns.dadosDaEmpresa" em vez de "Dados da empresa" — defeito que só apareceu quando
 * alguém criou uma conta de empresa de verdade, no navegador, e olhou para a tela.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({}) }));
vi.mock("@/services/autenticacao.service", () => ({ default: { reenviarConfirmacaoCadastro: vi.fn() } }));
vi.mock("@/components/acessibilidade/PainelAcessibilidade", () => ({ PainelAcessibilidade: () => null }));
vi.mock("@/components/legal/DocumentoLegalDialog", () => ({ DocumentoLegalDialog: () => null }));

const { ConfirmeSeuEmail } = await import("./comuns");

afterEach(cleanup);

describe("ConfirmeSeuEmail", () => {
  it("os quatro passos aparecem em português, não como chave de texto", () => {
    render(<ConfirmeSeuEmail email="empresa@exemplo.com" />);

    expect(screen.getByText("Dados da empresa")).toBeInTheDocument();
    expect(screen.getByText("Confirmar o e-mail")).toBeInTheDocument();
    expect(screen.getByText("Entrar na sua conta")).toBeInTheDocument();
    expect(screen.getByText("Análise do cadastro pela equipe do ACESSO")).toBeInTheDocument();
  });

  it("nenhuma chave de texto crua (cadastro.comuns.algumaCoisa) vai parar na tela", () => {
    const { container } = render(<ConfirmeSeuEmail email="empresa@exemplo.com" />);

    expect(container.textContent).not.toMatch(/\b[a-z-]+\.[a-zA-Z]+\.[a-zA-Z0-9]+/);
  });

  it("diz o e-mail para onde o link foi", () => {
    render(<ConfirmeSeuEmail email="empresa@exemplo.com" />);

    expect(screen.getByText("empresa@exemplo.com")).toBeInTheDocument();
  });
});
