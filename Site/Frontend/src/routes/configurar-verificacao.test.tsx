import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Configuração obrigatória do administrador: só aparece para quem a conta exige e ainda não tem; sem
 * sessão volta ao login; já configurada vai ao painel. Não há atalho para pular, e sair da conta existe.
 */

const { navegar, sessao } = vi.hoisted(() => ({
  navegar: vi.fn(),
  sessao: {
    inicializado: true,
    autenticado: true,
    usuario: { id: "a1", tipo: "administrador", mfaExigido: true, mfaConfigurado: false } as Record<string, unknown> | null,
    recarregar: vi.fn(),
    sair: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => opcoes,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div data-testid="navegar" data-to={to} />,
  useNavigate: () => navegar,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => sessao }));
vi.mock("@/components/seguranca/ConfiguradorTotp", () => ({
  ConfiguradorTotp: ({ aoConcluir, aoCancelar }: { aoConcluir: () => void; aoCancelar?: () => void }) => (
    <div>
      <p>configurador</p>
      <button type="button" onClick={aoConcluir}>
        terminar
      </button>
      {aoCancelar && <button type="button">cancelar</button>}
    </div>
  ),
}));

const { Route } = await import("./configurar-verificacao");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

beforeEach(() => {
  vi.clearAllMocks();
  sessao.inicializado = true;
  sessao.autenticado = true;
  sessao.usuario = { id: "a1", tipo: "administrador", mfaExigido: true, mfaConfigurado: false };
  sessao.recarregar.mockResolvedValue(undefined);
  sessao.sair.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("configurar-verificacao", () => {
  it("administrador sem a verificação: explica por que e mostra o configurador, sem opção de pular", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { level: 1, name: "Proteja o acesso administrativo" })).toBeInTheDocument();
    expect(screen.getByText(/precisam da verificação em duas etapas antes de usar o painel/)).toBeInTheDocument();
    expect(screen.getByText("configurador")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar|pular|depois/i })).not.toBeInTheDocument();
  });

  it("enquanto a sessão carrega, mostra o estado de carregamento", () => {
    sessao.inicializado = false;
    render(<Tela />);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando sua sessão");
  });

  it("sem sessão: volta ao login", () => {
    sessao.autenticado = false;
    sessao.usuario = null;
    render(<Tela />);

    expect(screen.getByTestId("navegar")).toHaveAttribute("data-to", "/entrar");
  });

  it("administrador que já configurou: vai ao painel", () => {
    sessao.usuario = { id: "a1", tipo: "administrador", mfaExigido: true, mfaConfigurado: true };
    render(<Tela />);

    expect(screen.getByTestId("navegar")).toHaveAttribute("data-to", "/admin");
  });

  it("conta que não é obrigada (candidato) não tem o que fazer aqui: vai às configurações de segurança", () => {
    sessao.usuario = { id: "c1", tipo: "candidato", mfaExigido: false, mfaConfigurado: false };
    render(<Tela />);

    expect(screen.getByTestId("navegar")).toHaveAttribute("data-to", "/configuracoes/seguranca");
  });

  it("ao concluir: relê o perfil (agora configurado) e vai ao painel", async () => {
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: "terminar" }));

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/admin", replace: true }));
    expect(sessao.recarregar).toHaveBeenCalledTimes(1);
  });

  it("dá para sair da conta sem configurar (nunca fica preso)", async () => {
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: /Sair da conta/ }));

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/entrar", replace: true }));
    expect(sessao.sair).toHaveBeenCalledTimes(1);
  });
});
