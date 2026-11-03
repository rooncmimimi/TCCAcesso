import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Tela do código do segundo fator: o que acontece com o desafio, com o código certo e o errado, com a
 * espera por erros seguidos, e como a pessoa troca para o código de recuperação. O servidor é simulado.
 */

const { navegar, iniciarSessao, concluirLogin, toast } = vi.hoisted(() => ({
  navegar: vi.fn(),
  iniciarSessao: vi.fn(),
  concluirLogin: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opcoes: Record<string, unknown>) => opcoes,
  Link: ({ to, children, ...resto }: { to: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
  useNavigate: () => navegar,
}));
vi.mock("@/hooks/useSessao", () => ({ useSessao: () => ({ iniciarSessao }) }));
vi.mock("@/services/totp.service", async (original) => ({
  ...(await original<typeof import("@/services/totp.service")>()),
  default: { concluirLogin },
}));
vi.mock("sonner", () => ({ toast }));

const { Route } = await import("./verificacao-em-duas-etapas");
const { guardarDesafio, lerDesafio } = await import("@/lib/desafioMfa");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

const erroDoServidor = (mensagem: string, codigo: string, status = 400) => ({ response: { status, data: { mensagem, detalhes: { codigo } } } });
const campo = () => document.getElementById("codigo-verificacao") as HTMLInputElement;
const enviar = () => fireEvent.click(screen.getByRole("button", { name: /Verificar e entrar/ }));

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  guardarDesafio("desafio-de-teste");
});

afterEach(cleanup);

describe("sem desafio", () => {
  it("volta ao login, trocando esta entrada no histórico", async () => {
    window.sessionStorage.clear();
    render(<Tela />);

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/entrar", replace: true }));
    expect(screen.queryByRole("button", { name: /Verificar e entrar/ })).not.toBeInTheDocument();
  });
});

describe("a tela", () => {
  it("tem título, rótulo de verdade, ajuda e o campo certo para código de uso único", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { level: 1, name: "Verificação em duas etapas" })).toBeInTheDocument();
    expect(document.querySelector('label[for="codigo-verificacao"]')).toHaveTextContent("Código do aplicativo");
    expect(campo()).toHaveAttribute("autocomplete", "one-time-code");
    expect(campo()).toHaveAttribute("inputmode", "numeric");
    expect(campo()).toHaveAccessibleDescription("O código muda a cada 30 segundos.");
  });

  it("o foco vai para o título ao abrir (quem usa leitor de tela ouve onde está)", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("mostra o link de volta ao login e acessibilidade", () => {
    render(<Tela />);

    expect(screen.getByRole("link", { name: /Voltar para o login/ })).toHaveAttribute("href", "/entrar");
    expect(screen.getByRole("link", { name: "Configurações de acessibilidade" })).toBeInTheDocument();
  });
});

describe("enviar o código", () => {
  it("vazio: avisa no campo e nem chama o servidor", async () => {
    render(<Tela />);

    enviar();

    expect(await screen.findByText("Digite os 6 números que o aplicativo mostra.")).toBeInTheDocument();
    expect(campo()).toHaveAttribute("aria-invalid", "true");
    expect(concluirLogin).not.toHaveBeenCalled();
  });

  it("código certo: abre a sessão, apaga o desafio e vai ao destino, sem deixar a tela no histórico", async () => {
    const resposta = { token: "t", refreshToken: "r", usuario: { tipo: "candidato" } };
    concluirLogin.mockResolvedValue(resposta);
    iniciarSessao.mockResolvedValue({ tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z" });
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "123456" } });
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/feed", replace: true }));
    expect(concluirLogin).toHaveBeenCalledWith("desafio-de-teste", "123456");
    expect(iniciarSessao).toHaveBeenCalledWith(resposta);
    expect(lerDesafio()).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Login realizado com sucesso!");
  });

  it("administrador que entra vai ao painel", async () => {
    concluirLogin.mockResolvedValue({ token: "t", refreshToken: "r", usuario: {} });
    iniciarSessao.mockResolvedValue({ tipo: "administrador", cadastroConcluidoEm: null, mfaExigido: true, mfaConfigurado: true });
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "123 456" } });
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/admin", replace: true }));
    expect(concluirLogin).toHaveBeenCalledWith("desafio-de-teste", "123 456");
  });

  it("código errado: mostra a mensagem do servidor, limpa o campo e mantém o desafio para tentar de novo", async () => {
    concluirLogin.mockRejectedValue(erroDoServidor("Código incorreto ou já usado. Confira o aplicativo e tente de novo.", "MFA_CODIGO_INVALIDO"));
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "000000" } });
    enviar();

    expect(await screen.findByRole("alert")).toHaveTextContent("Código incorreto ou já usado");
    expect(campo()).toHaveValue("");
    expect(campo()).toHaveFocus();
    expect(lerDesafio()).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("espera por erros seguidos: mostra o tempo, que vem do servidor", async () => {
    concluirLogin.mockRejectedValue(erroDoServidor("Muitas tentativas com código incorreto. Tente de novo em 5 minutos.", "MFA_ESPERA", 429));
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "123456" } });
    enviar();

    expect(await screen.findByRole("alert")).toHaveTextContent("Tente de novo em 5 minutos");
    expect(navegar).not.toHaveBeenCalled();
  });

  it("desafio vencido: apaga, avisa e volta ao login", async () => {
    concluirLogin.mockRejectedValue(erroDoServidor("A verificação expirou. Entre novamente.", "MFA_DESAFIO_EXPIRADO"));
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "123456" } });
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/entrar", replace: true }));
    expect(lerDesafio()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("A verificação expirou. Entre novamente.");
  });

  it("falha de rede: mensagem genérica no campo, sem perder o desafio", async () => {
    concluirLogin.mockRejectedValue(new Error("Network Error"));
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "123456" } });
    enviar();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível verificar agora");
    expect(lerDesafio()).not.toBeNull();
  });

  it("clique duplo envia uma vez só, e o botão mostra que está verificando", async () => {
    let concluir: (valor: unknown) => void = () => {};
    concluirLogin.mockReturnValue(new Promise((resolver) => (concluir = resolver)));
    iniciarSessao.mockResolvedValue({ tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z" });
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "123456" } });
    enviar();
    fireEvent.submit(campo().closest("form")!);

    expect(await screen.findByRole("button", { name: /Verificando/ })).toBeDisabled();
    expect(concluirLogin).toHaveBeenCalledTimes(1);

    concluir({ token: "t", refreshToken: "r", usuario: {} });
    await waitFor(() => expect(navegar).toHaveBeenCalled());
  });

  it("conta pausada: explica que a reativação é no login (o código já foi usado)", async () => {
    concluirLogin.mockResolvedValue({ contaPausada: true });
    iniciarSessao.mockResolvedValue({ contaPausada: true });
    render(<Tela />);

    fireEvent.change(campo(), { target: { value: "123456" } });
    enviar();

    expect(await screen.findByRole("heading", { name: "Sua conta está pausada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/entrar");
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe("código de recuperação", () => {
  it("troca o campo para texto e explica; voltar ao aplicativo desfaz", async () => {
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: /usar um código de recuperação/ }));

    expect(document.querySelector('label[for="codigo-verificacao"]')).toHaveTextContent("Código de recuperação");
    expect(campo()).toHaveAttribute("inputmode", "text");
    expect(screen.getByText(/Cada código vale uma única vez/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Usar o código do aplicativo" }));

    expect(document.querySelector('label[for="codigo-verificacao"]')).toHaveTextContent("Código do aplicativo");
  });

  it("envia o código de recuperação e, se restam poucos, avisa", async () => {
    concluirLogin.mockResolvedValue({ token: "t", refreshToken: "r", usuario: {}, codigosRecuperacaoRestantes: 2 });
    iniciarSessao.mockResolvedValue({ tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z" });
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: /usar um código de recuperação/ }));
    fireEvent.change(campo(), { target: { value: "ABCDE-FGHJK" } });
    enviar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(concluirLogin).toHaveBeenCalledWith("desafio-de-teste", "ABCDE-FGHJK");
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("Restam só 2 códigos de recuperação"));
  });

  it("com vários códigos sobrando, só informa quantos restam", async () => {
    concluirLogin.mockResolvedValue({ token: "t", refreshToken: "r", usuario: {}, codigosRecuperacaoRestantes: 8 });
    iniciarSessao.mockResolvedValue({ tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z" });
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: /usar um código de recuperação/ }));
    fireEvent.change(campo(), { target: { value: "ABCDE-FGHJK" } });
    enviar();

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith("Você entrou com um código de recuperação. Restam 8."));
  });

  it("vazio no modo de recuperação: pede o código de recuperação", async () => {
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: /usar um código de recuperação/ }));
    enviar();

    expect(await screen.findByText("Informe um código de recuperação.")).toBeInTheDocument();
  });
});

describe("desistir", () => {
  it("voltar ao login apaga o desafio", () => {
    render(<Tela />);

    fireEvent.click(screen.getByRole("link", { name: /Voltar para o login/ }));

    expect(lerDesafio()).toBeNull();
  });
});
