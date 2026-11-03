import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Fale conosco: o formulário só diz "enviada" quando a API confirmou o envio; mostra o que está errado antes de
 * enviar; e, quando o servidor não consegue enviar, dá outro caminho em vez de fingir. A API é simulada.
 */

const { enviar, sessao, toast } = vi.hoisted(() => ({
  enviar: vi.fn(),
  sessao: { usuario: null as Record<string, unknown> | null },
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => opcoes,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => sessao }));
vi.mock("@/services/contato.service", () => ({ default: { enviar } }));
vi.mock("sonner", () => ({ toast }));

const { Route } = await import("./fale-conosco");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

const campo = (id: string) => document.getElementById(id) as HTMLInputElement;

function preencher(valores: Partial<Record<"nome" | "email" | "assunto" | "mensagem", string>> = {}) {
  const v = {
    nome: "Maria da Silva",
    email: "maria@exemplo.com",
    assunto: "acessibilidade",
    mensagem: "O leitor de tela não anuncia o botão de candidatura na página de vagas.",
    ...valores,
  };

  fireEvent.change(campo("nome"), { target: { value: v.nome } });
  fireEvent.change(campo("email"), { target: { value: v.email } });
  fireEvent.change(campo("assunto"), { target: { value: v.assunto } });
  fireEvent.change(campo("mensagem"), { target: { value: v.mensagem } });
}

const enviarFormulario = () => fireEvent.click(screen.getByRole("button", { name: /Enviar mensagem/ }));

beforeEach(() => {
  vi.resetAllMocks();
  sessao.usuario = null;
});

afterEach(cleanup);

describe("formulário Fale conosco", () => {
  it("tem os quatro campos com rótulo de verdade, todos obrigatórios", () => {
    render(<Tela />);

    for (const [rotulo, id] of [["Seu nome", "nome"], ["E-mail para resposta", "email"], ["Assunto", "assunto"], ["Mensagem", "mensagem"]] as const) {
      // O rótulo é um <label for> de verdade (não placeholder) ligado ao campo.
      expect(document.querySelector(`label[for="${id}"]`)).toHaveTextContent(new RegExp(`^${rotulo}`));
      expect(campo(id)).toBeRequired();
    }

    expect(screen.getByRole("heading", { level: 1, name: "Fale conosco" })).toBeInTheDocument();
  });

  it("o campo-isca existe, mas fora do alcance de qualquer pessoa (escondido, sem tabulação)", () => {
    render(<Tela />);

    const isca = campo("website");
    expect(isca).toHaveAttribute("tabindex", "-1");
    expect(isca.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(isca).toHaveValue("");
  });

  it("mostra os erros antes de enviar e não chama a API", async () => {
    render(<Tela />);

    enviarFormulario();

    expect(await screen.findByText("Informe o seu nome (ao menos 3 caracteres).")).toBeInTheDocument();
    expect(screen.getByText("Informe o e-mail em que quer receber a resposta.")).toBeInTheDocument();
    expect(screen.getByText("Escolha um assunto.")).toBeInTheDocument();
    expect(screen.getByText(/Escreva ao menos 10 caracteres/)).toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();
  });

  it.each([
    ["nome com número", { nome: "Maria 2" }, /Use só letras/],
    ["e-mail inválido", { email: "maria@" }, /não parece válido/],
    ["mensagem curta", { mensagem: "oi" }, /ao menos 10 caracteres/],
  ])("não envia com %s", async (_nome, valores, esperado) => {
    render(<Tela />);
    preencher(valores);

    enviarFormulario();

    expect(await screen.findByText(esperado)).toBeInTheDocument();
    expect(enviar).not.toHaveBeenCalled();
  });

  it("envia os dados, e só então mostra 'Mensagem enviada', com o protocolo e o e-mail da resposta", async () => {
    enviar.mockResolvedValue({ protocolo: "ACE-1A2B3C4D" });
    render(<Tela />);
    preencher();

    enviarFormulario();

    await waitFor(() =>
      expect(enviar).toHaveBeenCalledWith({
        nome: "Maria da Silva",
        email: "maria@exemplo.com",
        assunto: "acessibilidade",
        mensagem: "O leitor de tela não anuncia o botão de candidatura na página de vagas.",
        website: "",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Mensagem enviada" })).toBeInTheDocument();
    expect(screen.getByText("ACE-1A2B3C4D")).toBeInTheDocument();
    expect(screen.getByText("maria@exemplo.com")).toBeInTheDocument();
  });

  it("não diz que enviou enquanto a API não respondeu", async () => {
    enviar.mockReturnValue(new Promise(() => {}));
    render(<Tela />);
    preencher();

    enviarFormulario();

    await waitFor(() => expect(enviar).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Mensagem enviada" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enviando/ })).toBeDisabled();
  });

  it("servidor sem envio disponível (503): avisa, mostra o e-mail de contato e NÃO mostra sucesso", async () => {
    enviar.mockRejectedValue({ response: { status: 503, data: { mensagem: "O envio pelo formulário não está disponível agora." } } });
    render(<Tela />);
    preencher();

    enviarFormulario();

    expect(await screen.findByText("O envio por aqui não está disponível agora.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "projetoacessoinclusivo@gmail.com" })[0]).toHaveAttribute(
      "href",
      "mailto:projetoacessoinclusivo@gmail.com",
    );
    expect(screen.queryByRole("heading", { name: "Mensagem enviada" })).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
  });

  it("limite de envios (429): mostra a mensagem do servidor e mantém o texto digitado", async () => {
    enviar.mockRejectedValue({ response: { status: 429, data: { mensagem: "Você já enviou várias mensagens. Aguarde um pouco antes de enviar outra." } } });
    render(<Tela />);
    preencher();

    enviarFormulario();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Aguarde um pouco")));
    expect(screen.queryByText("O envio por aqui não está disponível agora.")).not.toBeInTheDocument();
    expect(campo("mensagem")).toHaveValue("O leitor de tela não anuncia o botão de candidatura na página de vagas.");
  });

  it("quem está logado vê nome e e-mail já preenchidos", async () => {
    sessao.usuario = { id: "u1", nome: "Joana Souza", email: "joana@exemplo.com" };
    render(<Tela />);

    await waitFor(() => expect(campo("nome")).toHaveValue("Joana Souza"));
    expect(campo("email")).toHaveValue("joana@exemplo.com");
  });

  it("depois de enviar, dá para escrever outra mensagem com o formulário limpo", async () => {
    enviar.mockResolvedValue({ protocolo: "ACE-00000001" });
    render(<Tela />);
    preencher();
    enviarFormulario();
    await screen.findByRole("heading", { name: "Mensagem enviada" });

    fireEvent.click(screen.getByRole("button", { name: "Enviar outra mensagem" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Fale conosco" })).toBeInTheDocument();
    expect(campo("mensagem")).toHaveValue("");
  });
});
