import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Configurações → Privacidade e Segurança.
 *
 * Tudo o que é privacidade e segurança fica agrupado: visibilidade do perfil, mensagens, bloqueios, senha,
 * sessões e contas conectadas, e os documentos legais (com a versão aceita). Nenhuma tela é duplicada e as
 * rotas que já existiam continuam as mesmas. Os documentos também ficam no rodapé do app, para estarem ao
 * alcance depois do cadastro.
 */

const { sessao } = vi.hoisted(() => ({
  sessao: { usuario: null as Record<string, unknown> | null, atualizar: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => opcoes,
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/layouts/EstruturaApp", () => ({ EstruturaApp: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/GuardaAcesso", () => ({ GuardaAcesso: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => sessao }));
vi.mock("@/services/bloqueio.service", () => ({
  default: { atualizarPrivacidade: vi.fn(), atualizarPreferenciaMensagens: vi.fn() },
}));

const { Route: rotaHub } = await import("./index");
const { Route: rotaPrivacidade } = await import("./privacidade");
const { SuporteRodape } = await import("@/components/SuporteRodape");

const montar = (rota: unknown) => (rota as { component: () => ReactNode }).component;

function renderizar(rota: unknown) {
  const Tela = montar(rota);
  const cliente = new QueryClient();

  return render(
    <QueryClientProvider client={cliente}>
      <Tela />
    </QueryClientProvider>,
  );
}

const destino = (nome: string | RegExp) => screen.getByRole("link", { name: nome }).getAttribute("href");

beforeEach(() => {
  sessao.usuario = { id: "u1", tipo: "candidato", perfilPublico: true, preferenciaMensagens: "todos" };
});

afterEach(cleanup);

describe("hub das Configurações", () => {
  it("agrupa privacidade e segurança numa seção só, com as rotas de sempre", () => {
    renderizar(rotaHub);

    const secao = screen.getByRole("heading", { name: "Privacidade e Segurança" }).closest("div")!;

    expect(within(secao).getByRole("link", { name: /Visibilidade do perfil e mensagens/ })).toHaveAttribute("href", "/configuracoes/privacidade");
    expect(within(secao).getByRole("link", { name: /Usuários bloqueados/ })).toHaveAttribute("href", "/configuracoes/bloqueados");
    expect(within(secao).getByRole("link", { name: /Alterar senha/ })).toHaveAttribute("href", "/configuracoes/senha");
    expect(within(secao).getByRole("link", { name: /Sessões e contas conectadas/ })).toHaveAttribute("href", "/configuracoes/seguranca");
  });

  it("não duplica: senha e sessões saíram da seção Conta, e não há outra seção só de 'Privacidade'", () => {
    renderizar(rotaHub);

    expect(screen.getAllByRole("link", { name: /Alterar senha/ })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Sessões e contas conectadas/ })).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Privacidade" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Segurança" })).not.toBeInTheDocument();
    expect(destino(/Meus dados e perfil/)).toBe("/configuracoes/conta");
  });
});

describe("página Privacidade e Segurança", () => {
  it("reúne visibilidade, mensagens, bloqueios, segurança da conta e documentos", () => {
    renderizar(rotaPrivacidade);

    expect(screen.getByRole("heading", { level: 1, name: "Privacidade e Segurança" })).toBeInTheDocument();
    for (const secao of ["Perfil", "Mensagens", "Bloqueios", "Segurança da conta", "Documentos"]) {
      expect(screen.getByRole("heading", { level: 2, name: secao })).toBeInTheDocument();
    }

    expect(destino(/Usuários bloqueados/)).toBe("/configuracoes/bloqueados");
    expect(destino(/Alterar senha/)).toBe("/configuracoes/senha");
    expect(destino(/Sessões e contas conectadas/)).toBe("/configuracoes/seguranca");
    expect(destino(/Termos de Uso/)).toBe("/termos");
    expect(destino(/Aviso de Privacidade/)).toBe("/privacidade");
  });

  it("mostra a versão dos documentos que a pessoa aceitou e quando", () => {
    sessao.usuario = { ...sessao.usuario, termosAceitosEm: "2026-10-13T15:00:00.000Z", termosVersao: "2026-10-13" };
    renderizar(rotaPrivacidade);

    expect(screen.getByTestId("registro-de-aceite")).toHaveTextContent(/Você aceitou a versão 2026-10-13 em /);
  });

  it("para conta anterior ao registro, diz que não há versão registrada em vez de inventar uma", () => {
    renderizar(rotaPrivacidade);

    expect(screen.getByTestId("registro-de-aceite")).toHaveTextContent(/não há versão aceita registrada/);
  });
});

describe("rodapé do app", () => {
  it("dá acesso aos documentos legais e à página de Privacidade e Segurança depois do cadastro", () => {
    render(<SuporteRodape />);

    expect(destino("Termos de Uso")).toBe("/termos");
    expect(destino("Aviso de Privacidade")).toBe("/privacidade");
    expect(destino(/Privacidade e Segurança/)).toBe("/configuracoes/privacidade");
    // O Fale conosco é a página com o formulário, e não mais um mailto solto.
    expect(destino("Fale conosco")).toBe("/fale-conosco");
    expect(screen.queryByRole("link", { name: "Segurança" })).not.toBeInTheDocument();
  });
});
