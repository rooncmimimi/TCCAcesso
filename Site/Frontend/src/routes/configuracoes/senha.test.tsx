import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * `/configuracoes/senha`: quem tem senha a **altera**; quem entra só pelo Google ainda não tem uma e
 * a **define**, com um link enviado ao e-mail da conta (a prova de que a conta é dela). A sessão, a
 * estrutura da página e o serviço HTTP são simulados.
 */

const { usuarioDaSessao, esqueciSenha, avisoErro } = vi.hoisted(() => ({
  usuarioDaSessao: { email: "ana@exemplo.com", temSenha: undefined as boolean | undefined },
  esqueciSenha: vi.fn(),
  avisoErro: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => opcoes,
  Link: ({ to, search, children }: { to: string; search?: Record<string, string>; children: ReactNode }) => (
    <a href={search ? `${to}?${new URLSearchParams(search).toString()}` : to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario: usuarioDaSessao, sair: vi.fn() }) }));
vi.mock("@/layouts/EstruturaApp", () => ({ EstruturaApp: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/GuardaAcesso", () => ({ GuardaAcesso: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("sonner", () => ({ toast: { error: avisoErro, success: vi.fn() } }));
vi.mock("@/services/autenticacao.service", () => ({ autenticacaoService: { esqueciSenha, alterarSenha: vi.fn() } }));

const { Route } = await import("./senha");
const Pagina = (Route as unknown as { component: () => ReactNode }).component;

beforeEach(() => {
  vi.resetAllMocks();
  usuarioDaSessao.temSenha = undefined;
});

afterEach(cleanup);

describe("conta com senha", () => {
  it.each([[true], [undefined]])("continua sendo 'Alterar senha' (temSenha: %s)", (temSenha) => {
    usuarioDaSessao.temSenha = temSenha;
    render(<Pagina />);

    expect(screen.getByRole("heading", { name: "Alterar senha" })).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Definir senha" })).not.toBeInTheDocument();
  });
});

describe("conta que entra só pelo Google (sem senha)", () => {
  beforeEach(() => {
    usuarioDaSessao.temSenha = false;
  });

  it("é 'Definir senha', sem o campo de senha atual (não há o que digitar)", () => {
    render(<Pagina />);

    expect(screen.getByRole("heading", { name: "Definir senha" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Senha atual")).not.toBeInTheDocument();
  });

  it("diz para onde o e-mail vai e o que a senha libera", () => {
    render(<Pagina />);

    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByText(/pausar ou excluir a conta e trocar o e-mail/)).toBeInTheDocument();
  });

  it("manda o e-mail de definição para o endereço da conta, e só ele", async () => {
    esqueciSenha.mockResolvedValue(undefined);
    render(<Pagina />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar e-mail para definir a senha" }));

    await waitFor(() => expect(esqueciSenha).toHaveBeenCalledWith("ana@exemplo.com"));
    expect(esqueciSenha).toHaveBeenCalledTimes(1);
  });

  it("depois de enviar, confirma, avisa que as sessões se encerram e oferece digitar o código", async () => {
    esqueciSenha.mockResolvedValue(undefined);
    render(<Pagina />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar e-mail para definir a senha" }));

    expect(await screen.findByRole("status")).toHaveTextContent("E-mail enviado");
    expect(screen.getByRole("status")).toHaveTextContent("as suas sessões se encerram");
    expect(screen.getByRole("link", { name: "Usar o código" })).toHaveAttribute(
      "href",
      "/redefinir-senha?email=ana%40exemplo.com",
    );
    expect(screen.queryByRole("button", { name: "Enviar e-mail para definir a senha" })).not.toBeInTheDocument();
  });

  it("se o envio falhar, avisa e deixa tentar de novo", async () => {
    esqueciSenha.mockRejectedValue({ response: { status: 429, data: { mensagem: "Muitas tentativas." } } });
    render(<Pagina />);

    fireEvent.click(screen.getByRole("button", { name: "Enviar e-mail para definir a senha" }));

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith("Muitas tentativas."));
    expect(screen.getByRole("button", { name: "Enviar e-mail para definir a senha" })).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
