import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { lerEtapaSalva, salvarEtapa } from "@/lib/etapaCadastro";

/**
 * Retomada do cadastro de candidato depois do login.
 *
 * Regras (causa do redirecionamento errado, corrigida):
 * - cadastro **pendente** é cadastro com dado obrigatório faltando; quem só deixou de clicar no último
 *   botão do assistente (as etapas de perfil e acessibilidade são opcionais) entra normalmente;
 * - candidato logado com o cadastro completo que abre esta tela (inclusive pelo F5) é levado adiante,
 *   em vez de ver o formulário de conta de novo;
 * - quem tem dado faltando vê um passo curto para completá-lo, e não a etapa de perfil, que não os pede;
 * - atualizar a página não volta a etapa: a etapa fica lembrada, por usuário, na aba.
 *
 * Roteador, sessão e as peças pesadas das etapas seguintes são simulados; o passo de completar é o real.
 */

const { busca, navegar, sessao, perfil, recarregar } = vi.hoisted(() => ({
  busca: { retomar: undefined as boolean | undefined, depois: undefined, google: undefined },
  navegar: vi.fn(),
  recarregar: vi.fn(),
  perfil: {
    meuCandidato: vi.fn(),
    atualizarCandidato: vi.fn(),
  },
  sessao: {
    autenticado: true,
    inicializado: true,
    usuario: null as Record<string, unknown> | null,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => navegar,
}));
vi.mock("@/hooks/useSessao", () => ({
  useSessao: () => ({ ...sessao, registrarCandidato: vi.fn(), recarregar }),
}));
vi.mock("@/services/google.service", async (original) => ({
  ...(await original<typeof import("@/services/google.service")>()),
  default: { disponivel: vi.fn(async () => false), urlDeAutorizacao: vi.fn() },
}));
vi.mock("@/services/perfil.service", () => ({ perfilService: perfil }));
vi.mock("@/components/CidadeAutocomplete", () => ({
  CidadeAutocomplete: ({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) => (
    <input id={id} aria-label="Cidade" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/acessibilidade/PainelAcessibilidade", () => ({ PainelAcessibilidade: () => <p>Painel de acessibilidade</p> }));
vi.mock("@/components/cadastro/EtapaCurriculoPerfil", () => ({ EtapaCurriculoPerfil: () => <p>Etapa de perfil</p> }));

const { Route } = await import("./candidato");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

const candidatoLogado = (extra: Record<string, unknown> = {}) => ({
  id: "u1",
  tipo: "candidato",
  cadastroConcluidoEm: "2026-10-01T10:00:00Z",
  cadastroPendente: false,
  dadosCadastroPendentes: [],
  ...extra,
});

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  busca.retomar = undefined;
  sessao.autenticado = true;
  sessao.inicializado = true;
  sessao.usuario = candidatoLogado();
  perfil.meuCandidato.mockResolvedValue({ id: "c1", pais: null, dataNascimento: null, cidade: null, estado: null });
  perfil.atualizarCandidato.mockResolvedValue({});
  recarregar.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("candidato logado com o cadastro completo", () => {
  it("não vê o formulário de conta de novo: é levado para o feed, trocando a entrada do histórico", async () => {
    render(<Tela />);

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/feed", replace: true }));
    expect(screen.queryByRole("heading", { name: /conta/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando seu cadastro");
  });

  it("uma data de conclusão nula, mas com os dados todos, também entra normalmente (cadastroPendente=false)", async () => {
    sessao.usuario = candidatoLogado({ cadastroConcluidoEm: null, cadastroPendente: false });
    render(<Tela />);

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/feed", replace: true }));
  });

  it("espera a sessão carregar antes de decidir (sem expulsar nem mostrar o formulário por engano)", () => {
    sessao.inicializado = false;
    sessao.autenticado = false;
    sessao.usuario = null;
    render(<Tela />);

    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("quem não está logado", () => {
  it("vê o cadastro comum, sem redirecionamento", async () => {
    sessao.autenticado = false;
    sessao.usuario = null;
    render(<Tela />);

    expect(await screen.findByRole("heading", { name: "Crie sua conta" })).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("?retomar=true sem sessão não leva a etapa nenhuma que exija conta", async () => {
    busca.retomar = true;
    sessao.autenticado = false;
    sessao.usuario = null;
    render(<Tela />);

    expect(await screen.findByRole("heading", { name: "Crie sua conta" })).toBeInTheDocument();
  });
});

describe("candidato com dado obrigatório faltando", () => {
  beforeEach(() => {
    sessao.usuario = candidatoLogado({
      cadastroConcluidoEm: null,
      cadastroPendente: true,
      dadosCadastroPendentes: ["pais", "dataNascimento", "cidade", "estado"],
    });
  });

  it("vê o passo de completar os dados, e não a etapa de perfil nem o formulário de conta", async () => {
    render(<Tela />);

    expect(await screen.findByRole("heading", { name: "Faltam alguns dados" })).toBeInTheDocument();
    expect(document.getElementById("data-nascimento")).toBeInTheDocument();
    expect(screen.queryByText("Etapa de perfil")).not.toBeInTheDocument();
    // Nome e telefone já existem na conta e não são pedidos de novo.
    expect(screen.queryByLabelText(/^Nome/)).not.toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("não escolhe o país sozinho: com a conta sem país, o campo fica vazio", async () => {
    render(<Tela />);

    await screen.findByRole("heading", { name: "Faltam alguns dados" });
    await waitFor(() => expect(perfil.meuCandidato).toHaveBeenCalled());
    expect(screen.queryByText("Brasil")).not.toBeInTheDocument();
  });

  // O campo de data do navegador já descarta datas como 2026-02-30; as que chegam aqui existem, e a regra de
  // idade mínima (16 anos, dos Termos de Uso) é a que a pessoa de fato encontra.
  it("não deixa avançar com data de quem teria menos de 16 anos e explica o motivo", async () => {
    render(<Tela />);

    await screen.findByRole("heading", { name: "Faltam alguns dados" });
    const data = document.getElementById("data-nascimento") as HTMLInputElement;
    fireEvent.change(data, { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(await screen.findByText(/16 anos ou mais/)).toBeInTheDocument();
    expect(perfil.atualizarCandidato).not.toHaveBeenCalled();
  });
});

describe("etapa lembrada", () => {
  it("guarda a etapa por usuário e não entrega a de outra conta", () => {
    salvarEtapa("u1", 3);

    expect(lerEtapaSalva("u1")).toBe(3);
    expect(lerEtapaSalva("u2")).toBeNull();
  });

  it("com uma etapa salva nesta aba, retoma em vez de expulsar (atualizar a página não volta etapa)", async () => {
    salvarEtapa("u1", 3);
    render(<Tela />);

    expect(await screen.findByText("Painel de acessibilidade")).toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("?retomar=true explícito começa na etapa de perfil", async () => {
    busca.retomar = true;
    render(<Tela />);

    expect(await screen.findByText("Etapa de perfil")).toBeInTheDocument();
  });
});
