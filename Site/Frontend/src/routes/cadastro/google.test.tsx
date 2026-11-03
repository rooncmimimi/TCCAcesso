import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { guardarProva, lerProva } from "@/lib/googleNavegador";

/**
 * `/cadastro/google` (etapa 6): a pessoa que voltou do Google sem ter conta confere qual conta
 * Google será usada, aceita os termos e a conta nasce na hora, sem senha. A prova vem da aba, o
 * serviço HTTP e a sessão são simulados; a tela e o aceite dos termos são os de verdade.
 */

const { busca, navegar, iniciarSessao, cadastrar, avisoErro, avisoSucesso } = vi.hoisted(() => ({
  busca: { depois: undefined as "empresa" | undefined },
  navegar: vi.fn(),
  iniciarSessao: vi.fn(),
  cadastrar: vi.fn(),
  avisoErro: vi.fn(),
  avisoSucesso: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  useNavigate: () => navegar,
  Link: ({ to, search, children }: { to: string; search?: Record<string, unknown>; children: ReactNode }) => (
    <a href={search ? `${to}?${new URLSearchParams(JSON.parse(JSON.stringify(search))).toString()}` : to}>{children}</a>
  ),
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ iniciarSessao }) }));
vi.mock("sonner", () => ({ toast: { error: avisoErro, success: avisoSucesso } }));
vi.mock("@/layouts/AutenticacaoLayout", () => ({ AutenticacaoLayout: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/Logo", () => ({ Logo: () => <span>ACESSO</span> }));
vi.mock("@/components/legal/DocumentoLegalDialog", () => ({
  DocumentoLegalDialog: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));
vi.mock("@/services/google.service", async (original) => ({
  ...(await original<typeof import("@/services/google.service")>()),
  default: { cadastrar },
}));

const { Route } = await import("./google");
const { VERSAO_DOCUMENTOS } = await import("@/dados/documentosLegais");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

/** Uma prova com validade, como a do servidor: o Site só lê o perfil e o `exp`. */
function provaDeTeste(perfil: Record<string, unknown> = { email: "ana@exemplo.com", nome: "Ana Souza" }) {
  const corpo = Buffer.from(JSON.stringify({ perfil, exp: Math.floor(Date.now() / 1000) + 900 }), "utf8").toString("base64url");
  return `cabecalho.${corpo}.assinatura`;
}

const erroDoServidor = (status: number, mensagem: string) => ({ response: { status, data: { mensagem } } });

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  busca.depois = undefined;
});

afterEach(cleanup);

describe("sem prova do Google (venceu ou nunca houve)", () => {
  it("explica que a verificação expirou e leva de volta ao login, sem chamar o servidor", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { name: "A verificação com o Google expirou" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/entrar");
    expect(cadastrar).not.toHaveBeenCalled();
  });

  it("uma prova vencida é tratada como ausente", () => {
    const corpo = Buffer.from(JSON.stringify({ perfil: { email: "a@b.com" }, exp: 1 }), "utf8").toString("base64url");
    guardarProva(`c.${corpo}.a`);

    render(<Tela />);

    expect(screen.getByRole("heading", { name: "A verificação com o Google expirou" })).toBeInTheDocument();
  });
});

describe("com a prova do Google", () => {
  beforeEach(() => {
    guardarProva(provaDeTeste());
  });

  it("mostra qual conta Google será usada: nome e e-mail, que vêm da prova (a pessoa não digita)", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { name: "Criar conta com o Google" })).toBeInTheDocument();
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("não pede senha", () => {
    render(<Tela />);

    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    expect(screen.getByText(/não precisa criar uma senha/)).toBeInTheDocument();
  });

  it("o aceite dos termos é condição: sem marcar, mostra o erro e não cria a conta", async () => {
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    expect(await screen.findByText(/Aceite os Termos de Uso/)).toBeInTheDocument();
    expect(cadastrar).not.toHaveBeenCalled();
  });

  it("aceitando os termos, cria a conta mandando a prova e a versão dos documentos que a tela mostrou", async () => {
    const sessao = { usuario: { id: "u1" }, token: "t", refreshToken: "r" };
    cadastrar.mockResolvedValue(sessao);
    iniciarSessao.mockResolvedValue({ id: "u1" });
    const prova = lerProva()!;
    render(<Tela />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    await waitFor(() => expect(cadastrar).toHaveBeenCalledWith(prova, VERSAO_DOCUMENTOS));
    await waitFor(() => expect(iniciarSessao).toHaveBeenCalledWith(sessao));
  });

  it("depois de criar, apaga a prova da aba e segue para os dados pessoais, sem deixar esta tela no histórico", async () => {
    cadastrar.mockResolvedValue({ usuario: { id: "u1" } });
    iniciarSessao.mockResolvedValue({ id: "u1" });
    render(<Tela />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith({ to: "/cadastro/dados", search: { depois: undefined }, replace: true });
    expect(lerProva()).toBeNull();
    expect(avisoSucesso).toHaveBeenCalled();
  });

  it("preserva a intenção de seguir para o cadastro da empresa", async () => {
    busca.depois = "empresa";
    cadastrar.mockResolvedValue({ usuario: { id: "u1" } });
    iniciarSessao.mockResolvedValue({ id: "u1" });
    render(<Tela />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][0].search).toEqual({ depois: "empresa" });
  });

  it("quando o servidor recusa (ex.: e-mail já cadastrado), mostra o motivo, oferece entrar e mantém a prova", async () => {
    cadastrar.mockRejectedValue(erroDoServidor(409, "Este e-mail já está cadastrado."));
    render(<Tela />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    expect(await screen.findByText("Este e-mail já está cadastrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entre com ela" })).toHaveAttribute("href", "/entrar");
    expect(lerProva()).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Criar minha conta" })).toBeEnabled();
  });

  it("não mostra detalhe de erro interno do servidor", async () => {
    cadastrar.mockRejectedValue(erroDoServidor(500, "null value in column senha_hash"));
    render(<Tela />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));

    expect(await screen.findByText(/Não foi possível criar a conta agora/)).toBeInTheDocument();
    expect(screen.queryByText(/senha_hash/)).not.toBeInTheDocument();
  });

  it("não deixa criar duas vezes enquanto a primeira não terminou", async () => {
    cadastrar.mockReturnValue(new Promise(() => undefined));
    render(<Tela />);
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: "Criar minha conta" }));
    fireEvent.click(await screen.findByRole("button", { name: /Criando sua conta/ }));

    expect(cadastrar).toHaveBeenCalledTimes(1);
  });

  it("oferece o cadastro completo, com senha, que aceita a mesma prova do Google", () => {
    busca.depois = "empresa";
    render(<Tela />);

    expect(screen.getByRole("link", { name: "Cadastro completo" })).toHaveAttribute(
      "href",
      "/cadastro/candidato?google=true&depois=empresa",
    );
  });
});
