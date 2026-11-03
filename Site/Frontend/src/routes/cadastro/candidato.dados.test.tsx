import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * O cadastro de candidato quando a pessoa vem de uma conta criada pelo Google (etapa 6): se ainda
 * faltam os dados pessoais, o cadastro não segue para as etapas de perfil (que dependem deles) e
 * leva a `/cadastro/dados`. Roteador, sessão e as peças pesadas das etapas seguintes são simulados.
 */

const { busca, navegar, sessao } = vi.hoisted(() => ({
  busca: { retomar: true as boolean | undefined, depois: undefined as "empresa" | undefined, google: undefined },
  navegar: vi.fn(),
  sessao: {
    autenticado: true,
    usuario: { tipo: "candidato", dadosPessoaisPendentes: true as boolean | undefined } as Record<string, unknown> | null,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => navegar,
}));
vi.mock("@/hooks/useSessao", () => ({
  useSessao: () => ({
    autenticado: sessao.autenticado,
    usuario: sessao.usuario,
    inicializado: true,
    registrarCandidato: vi.fn(),
    recarregar: vi.fn(),
  }),
}));
vi.mock("@/services/google.service", async (original) => ({
  ...(await original<typeof import("@/services/google.service")>()),
  default: { disponivel: vi.fn(async () => false), urlDeAutorizacao: vi.fn() },
}));
vi.mock("@/services/perfil.service", () => ({ perfilService: { meuCandidato: vi.fn(async () => ({ id: "c1" })) } }));
vi.mock("@/components/CidadeAutocomplete", () => ({ CidadeAutocomplete: () => null }));
vi.mock("@/components/acessibilidade/PainelAcessibilidade", () => ({ PainelAcessibilidade: () => null }));
vi.mock("@/components/cadastro/EtapaCurriculoPerfil", () => ({ EtapaCurriculoPerfil: () => <p>Etapa de perfil</p> }));

const { Route } = await import("./candidato");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  busca.retomar = true;
  busca.depois = undefined;
  sessao.autenticado = true;
  sessao.usuario = { tipo: "candidato", dadosPessoaisPendentes: true };
});

afterEach(cleanup);

describe("retomando o cadastro com dados pessoais pendentes", () => {
  it("leva a /cadastro/dados, trocando esta entrada no histórico", async () => {
    render(<Tela />);

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/dados", search: { depois: undefined }, replace: true });
  });

  it("preserva a intenção de seguir para o cadastro da empresa", async () => {
    busca.depois = "empresa";
    render(<Tela />);

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][0].search).toEqual({ depois: "empresa" });
  });

  it("não mostra as etapas do cadastro enquanto leva", () => {
    render(<Tela />);

    expect(screen.getByRole("status")).toHaveTextContent("Abrindo seus dados");
    expect(screen.queryByText("Etapa de perfil")).not.toBeInTheDocument();
  });
});

describe("sem pendência", () => {
  it.each([[false], [undefined]])("(%j) retoma o cadastro de onde parou, sem redirecionar", async (pendente) => {
    sessao.usuario = { tipo: "candidato", dadosPessoaisPendentes: pendente };
    render(<Tela />);

    expect(await screen.findByText("Etapa de perfil")).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("o cadastro comum (sem ?retomar) nunca é desviado, mesmo com a pendência na sessão", () => {
    busca.retomar = undefined;
    sessao.autenticado = false;
    sessao.usuario = null;
    render(<Tela />);

    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Crie sua conta" })).toBeInTheDocument();
  });

  it("só candidato é desviado: quem não é candidato com ?retomar não vai para os dados de candidato", () => {
    sessao.usuario = { tipo: "empresa", dadosPessoaisPendentes: true };
    render(<Tela />);

    expect(navegar).not.toHaveBeenCalled();
  });
});
