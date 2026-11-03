import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Conta que entra só pelo Google e ainda não tem senha (etapa 6 da auditoria): as telas que pedem a
 * "senha atual" não mostram um campo que ninguém consegue preencher; mostram o motivo e o caminho
 * (definir a senha). Com senha, ou numa sessão antiga sem o campo, tudo segue como sempre foi.
 */

const { usuarioDaSessao } = vi.hoisted(() => ({
  usuarioDaSessao: { email: "ana@exemplo.com", temSenha: undefined as boolean | undefined },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));
vi.mock("@/hooks/useSessao", () => ({
  useSessao: () => ({ usuario: usuarioDaSessao, sair: vi.fn(), atualizar: vi.fn() }),
}));
vi.mock("@/services/autenticacao.service", () => ({ autenticacaoService: {} }));

const { AvisoSemSenha } = await import("./AvisoSemSenha");
const { SecaoContaPerigo } = await import("./SecaoContaPerigo");
const { SecaoTrocarEmail } = await import("./SecaoTrocarEmail");

// O `QueryClientProvider` é necessário porque as duas seções usam `useMutation`.
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const comQuery = (conteudo: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{conteudo}</QueryClientProvider>
);

beforeEach(() => {
  usuarioDaSessao.temSenha = undefined;
});

afterEach(cleanup);

describe("AvisoSemSenha", () => {
  it("explica que a conta entra com o Google e diz o que fazer, com o recurso pedido", () => {
    render(<AvisoSemSenha recurso="alterar o e-mail" />);

    expect(screen.getByRole("note")).toHaveTextContent("Sua conta entra com o Google e ainda não tem senha.");
    expect(screen.getByRole("note")).toHaveTextContent("Para alterar o e-mail, defina uma senha antes.");
  });

  it("leva à tela de definir senha", () => {
    render(<AvisoSemSenha recurso="x" />);

    expect(screen.getByRole("link", { name: "Definir senha" })).toHaveAttribute("href", "/configuracoes/senha");
  });
});

describe("Zona de risco (pausar e excluir)", () => {
  it("sem senha: mostra o aviso e nenhuma das duas ações", () => {
    usuarioDaSessao.temSenha = false;
    render(comQuery(<SecaoContaPerigo />));

    expect(screen.getByRole("note")).toHaveTextContent("pausar ou excluir a conta");
    expect(screen.queryByRole("button", { name: /Pausar conta/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir conta/ })).not.toBeInTheDocument();
  });

  it.each([[true], [undefined]])("com senha (%s): mostra as duas ações e não o aviso", (temSenha) => {
    usuarioDaSessao.temSenha = temSenha;
    render(comQuery(<SecaoContaPerigo />));

    expect(screen.getByRole("button", { name: /Pausar conta/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Excluir conta/ })).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

describe("Troca de e-mail", () => {
  it("sem senha: mostra o e-mail atual e o aviso, sem o botão de alterar", () => {
    usuarioDaSessao.temSenha = false;
    render(comQuery(<SecaoTrocarEmail />));

    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("alterar o e-mail");
    expect(screen.queryByRole("button", { name: /Alterar e-mail/ })).not.toBeInTheDocument();
  });

  it.each([[true], [undefined]])("com senha (%s): mostra o botão e não o aviso", (temSenha) => {
    usuarioDaSessao.temSenha = temSenha;
    render(comQuery(<SecaoTrocarEmail />));

    expect(screen.getByRole("button", { name: /Alterar e-mail/ })).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
