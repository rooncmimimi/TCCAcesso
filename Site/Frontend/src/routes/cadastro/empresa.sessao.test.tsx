import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Quem vê o assistente de empresa. O caso que quebrava: sem envio de e-mail, criar a empresa devolve a
 * sessão DELA, e a tela trocava a última etapa (acessibilidade) pela pergunta "já tem conta?".
 */

const { sessao } = vi.hoisted(() => ({
  sessao: { inicializado: true, autenticado: true, usuario: { tipo: "candidato" } as { tipo: string } | null },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => opcoes,
  Link: ({ children }: { children: ReactNode }) => <a href="#x">{children}</a>,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ ...sessao, registrarEmpresa: vi.fn() }) }));
vi.mock("@/components/cadastro/EscolhaDeContaParaEmpresa", () => ({ EscolhaDeContaParaEmpresa: () => <p>Escolha de conta</p> }));
vi.mock("@/components/CidadeAutocomplete", () => ({ CidadeAutocomplete: () => <input aria-label="cidade" /> }));

const { Route } = await import("./empresa");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

beforeEach(() => {
  Object.assign(sessao, { inicializado: true, autenticado: true, usuario: { tipo: "candidato" } });
});

afterEach(cleanup);

const noAssistente = () => screen.queryByRole("heading", { name: "Identificação da empresa" });

describe("assistente de empresa e a sessão", () => {
  it("candidato logado vê o assistente", () => {
    render(<Tela />);

    expect(noAssistente()).toBeInTheDocument();
  });

  it("quando a sessão vira a da empresa recém-criada, o assistente continua", () => {
    const { rerender } = render(<Tela />);

    sessao.usuario = { tipo: "empresa" };
    rerender(<Tela />);

    expect(screen.queryByText("Escolha de conta")).not.toBeInTheDocument();
    expect(noAssistente()).toBeInTheDocument();
  });

  it("empresa que chega já logada não vê o assistente", () => {
    sessao.usuario = { tipo: "empresa" };
    render(<Tela />);

    expect(screen.getByText("Escolha de conta")).toBeInTheDocument();
  });

  it("quem sai da conta no meio volta à escolha", () => {
    const { rerender } = render(<Tela />);

    Object.assign(sessao, { autenticado: false, usuario: null });
    rerender(<Tela />);

    expect(screen.getByText("Escolha de conta")).toBeInTheDocument();
  });
});
