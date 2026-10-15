import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Etapa 1 do cadastro de candidato quando a pessoa vem do Google: o e-mail que o Google verificou
 * vem preenchido e **travado**. O servidor recusa qualquer outro e-mail nesse cadastro (achado 1 da
 * auditoria), então deixar o campo editável só faria a pessoa descobrir isso no fim da etapa 2.
 *
 * Roteador, sessão e as peças pesadas das etapas seguintes são simulados; o formulário da etapa 1 é
 * o real.
 */

const { busca } = vi.hoisted(() => ({
  busca: { google: undefined as string | undefined, retomar: undefined, depois: undefined },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useSessao", () => ({
  useSessao: () => ({ autenticado: false, usuario: null, registrarCandidato: vi.fn() }),
}));

vi.mock("@/services/google.service", async (original) => ({
  ...(await original<typeof import("@/services/google.service")>()),
  default: { disponivel: vi.fn(async () => false), urlDeAutorizacao: vi.fn() },
}));

vi.mock("@/components/CidadeAutocomplete", () => ({ CidadeAutocomplete: () => null }));
vi.mock("@/components/acessibilidade/PainelAcessibilidade", () => ({ PainelAcessibilidade: () => null }));
vi.mock("@/components/cadastro/EtapaCurriculoPerfil", () => ({ EtapaCurriculoPerfil: () => null }));

const { Route } = await import("./candidato");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

/** Um código de entrega só para o Site ler nome e e-mail (a assinatura é conferida no servidor). */
function codigoDoGoogle(perfil: Record<string, unknown>) {
  const corpo = Buffer.from(JSON.stringify({ perfil })).toString("base64url");
  return `cabecalho.${corpo}.assinatura`;
}

beforeEach(() => {
  busca.google = undefined;
});

afterEach(cleanup);

describe("e-mail no cadastro vindo do Google", () => {
  beforeEach(() => {
    busca.google = codigoDoGoogle({ email: "ana@exemplo.com", nome: "Ana Souza", emailVerificado: true });
  });

  it("vem preenchido com o e-mail que o Google verificou", () => {
    render(<Tela />);
    expect(screen.getByRole("textbox", { name: /^E-mail/ })).toHaveValue("ana@exemplo.com");
  });

  it("vem travado para edição, mas continua legível e focável", () => {
    render(<Tela />);
    const campo = screen.getByRole("textbox", { name: /^E-mail/ });
    expect(campo).toHaveAttribute("readonly");
    expect(campo).not.toBeDisabled();
  });

  it("explica por que o e-mail não pode ser trocado", () => {
    render(<Tela />);
    expect(screen.getByText(/e-mail da sua conta Google/)).toBeInTheDocument();
  });

  it("mostra qual conta Google foi confirmada", () => {
    render(<Tela />);
    expect(screen.getByText(/Conta Google confirmada/)).toBeInTheDocument();
  });
});

describe("e-mail no cadastro comum, sem Google", () => {
  it("fica vazio e editável", () => {
    render(<Tela />);
    const campo = screen.getByRole("textbox", { name: /^E-mail/ });
    expect(campo).toHaveValue("");
    expect(campo).not.toHaveAttribute("readonly");
  });

  it("mostra a ajuda de sempre, e não a do Google", () => {
    render(<Tela />);
    expect(screen.getByText(/Use um e-mail que você acessa/)).toBeInTheDocument();
    expect(screen.queryByText(/e-mail da sua conta Google/)).not.toBeInTheDocument();
  });
});
