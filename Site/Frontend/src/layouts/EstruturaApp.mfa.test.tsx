import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * O `EstruturaApp` é o ponto único por onde passam as páginas autenticadas: o administrador que ainda não
 * configurou a verificação em duas etapas não vê nenhuma delas, vai para a configuração. É só experiência;
 * quem nega de verdade é o servidor.
 */

const { sessao } = vi.hoisted(() => ({ sessao: { usuario: null as Record<string, unknown> | null } }));

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navegar" data-to={to} />,
}));
vi.mock("./CabecalhoApp", () => ({ CabecalhoApp: () => <header>cabecalho</header> }));
vi.mock("./TelaStatusEmpresa", () => ({ TelaStatusEmpresa: () => <div>status da empresa</div> }));
vi.mock("@/components/SuporteRodape", () => ({ SuporteRodape: () => <footer>rodape</footer> }));
vi.mock("@/components/acessibilidade/ConsentimentoVozDialog", () => ({ ConsentimentoVozDialog: () => null }));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => sessao }));

const { EstruturaApp } = await import("./EstruturaApp");

beforeEach(() => {
  sessao.usuario = null;
});

afterEach(cleanup);

const pagina = () => render(<EstruturaApp><p>conteúdo da página</p></EstruturaApp>);

describe("administrador e a verificação em duas etapas", () => {
  it("exigida e não configurada: nenhuma página abre, vai para a configuração", () => {
    sessao.usuario = { tipo: "administrador", mfaExigido: true, mfaConfigurado: false };
    pagina();

    expect(screen.getByTestId("navegar")).toHaveAttribute("data-to", "/configurar-verificacao");
    expect(screen.queryByText("conteúdo da página")).not.toBeInTheDocument();
    expect(screen.queryByText("cabecalho")).not.toBeInTheDocument();
  });

  it("configurada: a página abre normalmente", () => {
    sessao.usuario = { tipo: "administrador", mfaExigido: true, mfaConfigurado: true };
    pagina();

    expect(screen.getByText("conteúdo da página")).toBeInTheDocument();
    expect(screen.queryByTestId("navegar")).not.toBeInTheDocument();
  });

  it("recurso desligado no servidor (mfaExigido falso): sem mudança nenhuma", () => {
    sessao.usuario = { tipo: "administrador", mfaExigido: false, mfaConfigurado: false };
    pagina();

    expect(screen.getByText("conteúdo da página")).toBeInTheDocument();
  });

  it("servidor antigo (sem os campos): sem mudança nenhuma", () => {
    sessao.usuario = { tipo: "administrador" };
    pagina();

    expect(screen.getByText("conteúdo da página")).toBeInTheDocument();
  });

  it("candidato e empresa nunca são redirecionados por isso", () => {
    for (const tipo of ["candidato", "empresa"]) {
      sessao.usuario = { tipo, mfaExigido: true, mfaConfigurado: false };
      const { unmount } = pagina();

      expect(screen.queryByTestId("navegar")).not.toBeInTheDocument();
      unmount();
    }
  });
});
