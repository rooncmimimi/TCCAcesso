import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { guardarProva, lerProva } from "@/lib/googleNavegador";

/**
 * Etapa 1 do cadastro de candidato quando a pessoa vem do Google: o e-mail que o Google verificou
 * vem preenchido e **travado**. O servidor recusa qualquer outro e-mail nesse cadastro (achado 1 da
 * auditoria), então deixar o campo editável só faria a pessoa descobrir isso no fim da etapa 2.
 *
 * A prova do Google (achado 13) vem do `sessionStorage` da aba, não da URL: o `?google=true` só diz
 * que a pessoa chegou do Google. Sem a bandeira, uma prova que sobrou de um cadastro abandonado é
 * descartada em vez de travar o e-mail de outro cadastro.
 *
 * Roteador, sessão e as peças pesadas das etapas seguintes são simulados; o formulário da etapa 1 é
 * o real.
 */

const { busca, registrarCandidato } = vi.hoisted(() => ({
  busca: { google: undefined as boolean | undefined, retomar: undefined, depois: undefined },
  registrarCandidato: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => ({ ...opcoes, useSearch: () => busca }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useSessao", () => ({
  useSessao: () => ({ autenticado: false, usuario: null, registrarCandidato }),
}));

vi.mock("@/services/google.service", async (original) => ({
  ...(await original<typeof import("@/services/google.service")>()),
  default: { disponivel: vi.fn(async () => false), urlDeAutorizacao: vi.fn() },
}));

vi.mock("@/services/perfil.service", () => ({
  perfilService: { meuCandidato: vi.fn(async () => ({ id: "c1" })) },
}));

vi.mock("@/components/CidadeAutocomplete", () => ({
  CidadeAutocomplete: ({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) => (
    <input id={id} aria-label="Cidade" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/acessibilidade/PainelAcessibilidade", () => ({ PainelAcessibilidade: () => null }));
vi.mock("@/components/cadastro/EtapaCurriculoPerfil", () => ({ EtapaCurriculoPerfil: () => null }));

const { Route } = await import("./candidato");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

/** Uma prova com validade, como a do servidor: o Site só lê o perfil e o `exp` (a assinatura é conferida lá). */
function provaDoGoogle(perfil: Record<string, unknown>, expiraEmSegundos = 900) {
  const corpo = Buffer.from(
    JSON.stringify({ perfil, exp: Math.floor(Date.now() / 1000) + expiraEmSegundos }),
    "utf8"
  ).toString("base64url");
  return `cabecalho.${corpo}.assinatura`;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  busca.google = undefined;
});

afterEach(cleanup);

describe("e-mail no cadastro vindo do Google", () => {
  beforeEach(() => {
    guardarProva(provaDoGoogle({ email: "ana@exemplo.com", nome: "Ana Souza", emailVerificado: true }));
    busca.google = true;
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

describe("prova do Google que não vale", () => {
  it("uma prova vencida é descartada: o cadastro segue comum, com o e-mail livre", () => {
    guardarProva(provaDoGoogle({ email: "ana@exemplo.com", nome: "Ana" }, -60));
    busca.google = true;

    render(<Tela />);

    const campo = screen.getByRole("textbox", { name: /^E-mail/ });
    expect(campo).toHaveValue("");
    expect(campo).not.toHaveAttribute("readonly");
    expect(screen.queryByText(/Conta Google confirmada/)).not.toBeInTheDocument();
  });

  it("sem o ?google, uma prova que sobrou de um cadastro abandonado não trava o e-mail", () => {
    guardarProva(provaDoGoogle({ email: "ana@exemplo.com", nome: "Ana" }));
    busca.google = undefined;

    render(<Tela />);

    expect(screen.getByRole("textbox", { name: /^E-mail/ })).toHaveValue("");
    expect(screen.queryByText(/Conta Google confirmada/)).not.toBeInTheDocument();
  });

  it("sem o ?google, a prova que sobrou é apagada da aba", async () => {
    guardarProva(provaDoGoogle({ email: "ana@exemplo.com", nome: "Ana" }));
    busca.google = undefined;

    render(<Tela />);

    await waitFor(() => expect(lerProva()).toBeNull());
  });

  it("com o ?google e a prova guardada, ela continua na aba até o cadastro terminar", () => {
    const prova = provaDoGoogle({ email: "ana@exemplo.com", nome: "Ana" });
    guardarProva(prova);
    busca.google = true;

    render(<Tela />);

    expect(lerProva()).toBe(prova);
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

describe("envio do cadastro vindo do Google", () => {
  const campo = (id: string) => document.getElementById(id) as HTMLInputElement;
  const digitar = (id: string, valor: string) => fireEvent.change(campo(id), { target: { value: valor } });

  /** Percorre as duas etapas obrigatórias (conta e dados) e clica em "Criar conta". */
  async function preencherEEnviar({ comEmailEdicao }: { comEmailEdicao: boolean }) {
    if (comEmailEdicao) digitar("email-cadastro", "ana@exemplo.com");
    digitar("cpf", "52998224725");
    digitar("senha-cadastro", "Senha@1234");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /^Continuar/ }));

    await waitFor(() => expect(campo("telefone")).toBeInTheDocument());
    digitar("nome", "Ana Souza");
    digitar("telefone", "11999999999");
    digitar("data-nascimento", "1990-05-10");
    digitar("cidade", "São Paulo");
    digitar("estado", "SP");
    fireEvent.click(screen.getByRole("button", { name: /^Criar conta/ }));
  }

  it("manda a prova ao servidor no campo googleCodigo e a apaga da aba quando a conta é criada", async () => {
    const prova = provaDoGoogle({ email: "ana@exemplo.com", nome: "Ana Souza" });
    guardarProva(prova);
    busca.google = true;
    registrarCandidato.mockResolvedValue({ id: "u1" });

    render(<Tela />);
    await preencherEEnviar({ comEmailEdicao: false });

    await waitFor(() => expect(registrarCandidato).toHaveBeenCalled());
    expect(registrarCandidato.mock.calls[0][0]).toMatchObject({ email: "ana@exemplo.com", googleCodigo: prova });
    await waitFor(() => expect(lerProva()).toBeNull());
  });

  it("não apaga a prova quando o servidor recusa o cadastro: a pessoa pode corrigir e tentar de novo", async () => {
    const prova = provaDoGoogle({ email: "ana@exemplo.com", nome: "Ana Souza" });
    guardarProva(prova);
    busca.google = true;
    registrarCandidato.mockRejectedValue({ response: { status: 409, data: { mensagem: "CPF já cadastrado." } } });

    render(<Tela />);
    await preencherEEnviar({ comEmailEdicao: false });

    await waitFor(() => expect(registrarCandidato).toHaveBeenCalled());
    await screen.findByRole("button", { name: /^Criar conta/ });
    expect(lerProva()).toBe(prova);
  });

  it("sem Google, não manda googleCodigo", async () => {
    registrarCandidato.mockResolvedValue({ id: "u1" });

    render(<Tela />);
    await preencherEEnviar({ comEmailEdicao: true });

    await waitFor(() => expect(registrarCandidato).toHaveBeenCalled());
    expect(registrarCandidato.mock.calls[0][0]).not.toHaveProperty("googleCodigo");
  });
});
