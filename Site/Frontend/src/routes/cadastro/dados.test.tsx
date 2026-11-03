import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * `/cadastro/dados` (etapa 6): os dados pessoais de quem criou a conta direto pelo Google. Mesmas
 * regras e mensagens do cadastro por formulário. A sessão e o serviço de perfil são simulados.
 */

const { busca, navegar, sessao, recarregar, meuCandidato, atualizarCandidato, atualizarUsuario, avisoErro } = vi.hoisted(() => ({
  busca: { depois: undefined as "empresa" | undefined },
  navegar: vi.fn(),
  sessao: {
    usuario: { id: "u1", telefone: null as string | null, dadosPessoaisPendentes: true as boolean | undefined },
  },
  recarregar: vi.fn(),
  meuCandidato: vi.fn(),
  atualizarCandidato: vi.fn(),
  atualizarUsuario: vi.fn(),
  avisoErro: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  useNavigate: () => navegar,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ usuario: sessao.usuario, recarregar }) }));
vi.mock("@/components/GuardaAcesso", () => ({ GuardaAcesso: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("sonner", () => ({ toast: { error: avisoErro, success: vi.fn() } }));
vi.mock("@/layouts/AutenticacaoLayout", () => ({ AutenticacaoLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/Logo", () => ({ Logo: () => <span>ACESSO</span> }));
vi.mock("@/components/CidadeAutocomplete", () => ({
  CidadeAutocomplete: ({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) => (
    <input id={id} aria-label="Cidade" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/services/perfil.service", () => ({ perfilService: { meuCandidato, atualizarCandidato, atualizarUsuario } }));

const { Route } = await import("./dados");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

const abrir = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Tela />
    </QueryClientProvider>,
  );

const campo = (id: string) => document.getElementById(id) as HTMLInputElement;
const digitar = (id: string, valor: string) => fireEvent.change(campo(id), { target: { value: valor } });
const preencherTudo = () => {
  digitar("cpf", "52998224725");
  digitar("telefone", "11999999999");
  digitar("data-nascimento", "1990-05-10");
  digitar("cidade", "São Paulo");
  digitar("estado", "sp");
};
const enviar = async () => {
  await waitFor(() => expect(screen.getByRole("button", { name: /Continuar/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
};

beforeEach(() => {
  vi.resetAllMocks();
  busca.depois = undefined;
  sessao.usuario = { id: "u1", telefone: null, dadosPessoaisPendentes: true };
  meuCandidato.mockResolvedValue({ id: "c1" });
  atualizarCandidato.mockResolvedValue({});
  atualizarUsuario.mockResolvedValue({});
  recarregar.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("a tela", () => {
  it("pede só o que falta: país, CPF, telefone, nascimento, cidade e estado (e não e-mail, nome nem senha)", () => {
    abrir();

    expect(screen.getByRole("heading", { name: "Complete seus dados" })).toBeInTheDocument();
    for (const id of ["pais", "cpf", "telefone", "data-nascimento", "cidade", "estado"]) {
      expect(campo(id), id).toBeInTheDocument();
    }
    expect(document.getElementById("email-cadastro")).toBeNull();
    expect(document.getElementById("senha-cadastro")).toBeNull();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });

  it("começa com o país Brasil e com o telefone que a conta já tiver", () => {
    sessao.usuario = { id: "u1", telefone: "11988887777", dadosPessoaisPendentes: true };
    abrir();

    expect(campo("pais")).toHaveValue("Brasil");
    expect(campo("telefone")).toHaveValue("(11) 98888-7777");
  });

  it("o botão só habilita depois de o perfil de candidato carregar", async () => {
    meuCandidato.mockReturnValue(new Promise(() => undefined));
    abrir();

    expect(screen.getByRole("button", { name: /Continuar/ })).toBeDisabled();
  });
});

describe("validação (as mesmas regras e mensagens do cadastro)", () => {
  it("campos vazios: mostra os erros e não salva nada", async () => {
    abrir();

    await enviar();

    expect(await screen.findByText("Informe seu CPF.")).toBeInTheDocument();
    expect(screen.getByText("Informe seu telefone.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua data de nascimento.")).toBeInTheDocument();
    expect(atualizarCandidato).not.toHaveBeenCalled();
    expect(atualizarUsuario).not.toHaveBeenCalled();
  });

  it("CPF com menos de 11 dígitos é recusado", async () => {
    abrir();
    preencherTudo();
    digitar("cpf", "123");

    await enviar();

    expect(await screen.findByText(/CPF/i, { selector: "p[role=alert]" })).toBeInTheDocument();
    expect(atualizarCandidato).not.toHaveBeenCalled();
  });

  it("data de nascimento no futuro é recusada", async () => {
    abrir();
    preencherTudo();
    digitar("data-nascimento", "2999-01-01");

    await enviar();

    await waitFor(() => expect(atualizarCandidato).not.toHaveBeenCalled());
    expect(await screen.findByText(/futuro|data/i, { selector: "p[role=alert]" })).toBeInTheDocument();
  });
});

describe("ao salvar", () => {
  it("grava os dados do candidato (CPF e telefone só com dígitos, estado em maiúsculas) e depois o telefone da conta", async () => {
    abrir();
    preencherTudo();

    await enviar();

    await waitFor(() => expect(atualizarCandidato).toHaveBeenCalled());
    expect(atualizarCandidato).toHaveBeenCalledWith("c1", {
      cpf: "52998224725",
      pais: "BR",
      dataNascimento: "1990-05-10",
      cidade: "São Paulo",
      estado: "SP",
    });
    expect(atualizarUsuario).toHaveBeenCalledWith("u1", { telefone: "11999999999" });
  });

  it("recarrega a sessão, e quando a pendência some segue para o resto do cadastro, trocando esta tela no histórico", async () => {
    recarregar.mockImplementation(async () => {
      sessao.usuario = { ...sessao.usuario, dadosPessoaisPendentes: false };
    });
    abrir();
    preencherTudo();

    await enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/candidato", search: { retomar: true, depois: undefined }, replace: true });
  });

  it("preserva a intenção de seguir para o cadastro da empresa", async () => {
    busca.depois = "empresa";
    recarregar.mockImplementation(async () => {
      sessao.usuario = { ...sessao.usuario, dadosPessoaisPendentes: false };
    });
    abrir();
    preencherTudo();

    await enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][0].search).toEqual({ retomar: true, depois: "empresa" });
  });

  it("CPF já cadastrado: o erro aparece no campo do CPF e no aviso, e nada segue", async () => {
    atualizarCandidato.mockRejectedValue({ response: { status: 409, data: { mensagem: "Este CPF já está cadastrado." } } });
    abrir();
    preencherTudo();

    await enviar();

    expect(await screen.findByText("Este CPF já está cadastrado.", { selector: "p[role=alert]" })).toBeInTheDocument();
    expect(avisoErro).toHaveBeenCalledWith("Este CPF já está cadastrado.");
    expect(atualizarUsuario).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("falha genérica: avisa, deixa tentar de novo e não segue", async () => {
    atualizarCandidato.mockRejectedValue(new Error("rede"));
    abrir();
    preencherTudo();

    await enviar();

    await waitFor(() => expect(avisoErro).toHaveBeenCalledWith(expect.stringContaining("Não foi possível salvar")));
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeEnabled();
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe("quando não há nada pendente", () => {
  it.each([[false], [undefined]])("(%j) leva direto ao resto do cadastro, sem mostrar o formulário em vão", async (pendente) => {
    sessao.usuario = { id: "u1", telefone: null, dadosPessoaisPendentes: pendente };
    abrir();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/candidato", search: { retomar: true, depois: undefined }, replace: true });
  });
});
