import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * "Acho que invadiram minha conta" (página pública): o pedido por e-mail, com resposta sempre igual, e a confirmação pelo link,
 * que só acontece num clique. O servidor é simulado.
 */

const { busca, solicitarProtecao, confirmarProtecao } = vi.hoisted(() => ({
  busca: { token: undefined as string | undefined },
  solicitarProtecao: vi.fn(),
  confirmarProtecao: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  Link: ({ to, children, search: _search, ...resto }: { to: string; children: ReactNode; search?: unknown } & Record<string, unknown>) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
}));
vi.mock("@/services/seguranca.service", async (original) => ({
  ...(await original<typeof import("@/services/seguranca.service")>()),
  default: { solicitarProtecao, confirmarProtecao },
}));

const { Route } = await import("./conta-comprometida");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

const erroDoServidor = (mensagem: string, codigo: string, status = 400) => ({ response: { status, data: { mensagem, detalhes: { codigo } } } });

beforeEach(() => {
  vi.clearAllMocks();
  busca.token = undefined;
  window.localStorage.clear();
});

afterEach(cleanup);

describe("sem link (pedir)", () => {
  it("pede o e-mail, com título, rótulo de verdade e foco no título", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { level: 1, name: "Acho que invadiram minha conta" })).toHaveFocus();
    expect(document.querySelector('label[for="email-protecao"]')).toHaveTextContent("E-mail da conta");
    expect(document.getElementById("email-protecao")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByRole("link", { name: /Voltar para o login/ })).toHaveAttribute("href", "/entrar");
  });

  it("e-mail inválido: avisa no campo e nem chama o servidor", async () => {
    render(<Tela />);

    fireEvent.change(document.getElementById("email-protecao") as HTMLInputElement, { target: { value: "isto-nao-e-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de proteção" }));

    expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(solicitarProtecao).not.toHaveBeenCalled();
  });

  it("mostra a resposta do servidor, a mesma para qualquer e-mail (não revela se a conta existe)", async () => {
    solicitarProtecao.mockResolvedValue("Se existe uma conta com este e-mail, enviamos um link para protegê-la. Ele vale por 1 hora.");
    render(<Tela />);

    fireEvent.change(document.getElementById("email-protecao") as HTMLInputElement, { target: { value: "ana@exemplo.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de proteção" }));

    expect(await screen.findByText(/Se existe uma conta com este e-mail/)).toBeInTheDocument();
    expect(solicitarProtecao).toHaveBeenCalledWith("ana@exemplo.com");
    expect(screen.getByRole("heading", { level: 1, name: "Verifique o seu e-mail" })).toBeInTheDocument();
  });

  it("falha do servidor: mostra o erro e mantém o formulário", async () => {
    solicitarProtecao.mockRejectedValue(erroDoServidor("Muitas tentativas. Aguarde.", "LIMITE", 429));
    render(<Tela />);

    fireEvent.change(document.getElementById("email-protecao") as HTMLInputElement, { target: { value: "ana@exemplo.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link de proteção" }));

    expect(await screen.findByText("Muitas tentativas. Aguarde.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar link de proteção" })).toBeEnabled();
  });
});

describe("com link (confirmar)", () => {
  beforeEach(() => {
    busca.token = "token-do-link";
  });

  it("NÃO protege ao abrir a página: espera o clique (um programa que pré-visualiza links não gasta o link)", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { level: 1, name: "Proteger a sua conta" })).toBeInTheDocument();
    expect(confirmarProtecao).not.toHaveBeenCalled();
    expect(screen.getByText(/Depois, você cria uma nova senha/)).toBeInTheDocument();
  });

  it("no clique, confirma com o token do link e mostra o resultado", async () => {
    confirmarProtecao.mockResolvedValue("Sua conta foi protegida: todas as sessões foram encerradas.");
    window.localStorage.setItem("acesso:dispositivoConfiavel", "token-do-aparelho");
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: "Proteger minha conta" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Conta protegida" })).toBeInTheDocument();
    expect(confirmarProtecao).toHaveBeenCalledWith("token-do-link");
    expect(screen.getByText(/Abra o e-mail que acabamos de enviar/)).toBeInTheDocument();
    // O aparelho que era de confiança deixa de ser lembrado aqui também (o servidor já revogou).
    expect(window.localStorage.getItem("acesso:dispositivoConfiavel")).toBeNull();
  });

  it("link vencido ou já usado: explica e oferece pedir outro", async () => {
    confirmarProtecao.mockRejectedValue(erroDoServidor("Este link expirou ou já foi usado.", "LINK_DE_SEGURANCA_INVALIDO"));
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: "Proteger minha conta" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Este link não vale mais" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir um novo link" })).toBeInTheDocument();
  });

  it("outra falha: mostra o erro e permite tentar de novo", async () => {
    confirmarProtecao.mockRejectedValue(erroDoServidor("Não foi possível agora.", "OUTRO", 503));
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: "Proteger minha conta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível agora.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Proteger minha conta" })).toBeEnabled());
  });

  it("cliques repetidos não confirmam duas vezes", async () => {
    confirmarProtecao.mockReturnValue(new Promise(() => undefined));
    render(<Tela />);

    const botao = screen.getByRole("button", { name: "Proteger minha conta" });
    fireEvent.click(botao);
    fireEvent.click(botao);

    await waitFor(() => expect(confirmarProtecao).toHaveBeenCalledTimes(1));
  });
});
