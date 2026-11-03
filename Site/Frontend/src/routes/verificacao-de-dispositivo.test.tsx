import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Tela do código enviado por e-mail ao entrar num dispositivo novo: o que acontece com o desafio, com o código certo e o errado, com
 * o reenvio e a espera, e com a escolha de lembrar o aparelho. O servidor é simulado.
 */

const { navegar, iniciarSessao, concluirLogin, reenviarCodigo, toast } = vi.hoisted(() => ({
  navegar: vi.fn(),
  iniciarSessao: vi.fn(),
  concluirLogin: vi.fn(),
  reenviarCodigo: vi.fn(),
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
vi.mock("@/services/seguranca.service", async (original) => ({
  ...(await original<typeof import("@/services/seguranca.service")>()),
  default: { concluirLogin, reenviarCodigo },
}));
vi.mock("sonner", () => ({ toast }));

const { Route } = await import("./verificacao-de-dispositivo");
const { guardarVerificacao, lerVerificacao } = await import("@/lib/verificacaoDispositivo");
const { lerDesafio } = await import("@/lib/desafioMfa");
const Tela = (Route as unknown as { component: () => ReactNode }).component;

const erroDoServidor = (mensagem: string, codigo: string, status = 400, extra: Record<string, unknown> = {}) => ({
  response: { status, data: { mensagem, detalhes: { codigo, ...extra } } },
});
const campo = () => document.getElementById("codigo-dispositivo") as HTMLInputElement;
const confirmar = () => fireEvent.click(screen.getByRole("button", { name: /Confirmar e entrar/ }));
const digitar = (valor: string) => fireEvent.change(campo(), { target: { value: valor } });
const guardar = (enviadoHaSegundos = 120) =>
  guardarVerificacao({ desafio: "desafio-de-teste", emailMascarado: "an***@exemplo.com", reenvioEmSegundos: 60 }, Date.now() - enviadoHaSegundos * 1000);

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  window.localStorage.clear();
  guardar();
});

afterEach(cleanup);

describe("sem desafio", () => {
  it("volta ao login, trocando esta entrada no histórico", async () => {
    window.sessionStorage.clear();
    render(<Tela />);

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/entrar", replace: true }));
    expect(screen.queryByRole("button", { name: /Confirmar e entrar/ })).not.toBeInTheDocument();
  });
});

describe("a tela", () => {
  it("diz para onde o código foi, com título, rótulo de verdade e o campo certo para código de uso único", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { level: 1, name: "Confirme este dispositivo" })).toBeInTheDocument();
    expect(screen.getByText("an***@exemplo.com")).toBeInTheDocument();
    expect(document.querySelector('label[for="codigo-dispositivo"]')).toHaveTextContent("Código recebido por e-mail");
    expect(campo()).toHaveAttribute("autocomplete", "one-time-code");
    expect(campo()).toHaveAttribute("inputmode", "numeric");
    expect(campo()).toHaveAccessibleDescription("Não chegou? Olhe também a caixa de spam.");
  });

  it("o foco vai para o título ao abrir", () => {
    render(<Tela />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("a opção de lembrar o dispositivo começa DESMARCADA e tem explicação ligada ao campo", () => {
    render(<Tela />);

    const caixa = screen.getByRole("checkbox", { name: "Lembrar este dispositivo" });

    expect(caixa).not.toBeChecked();
    expect(caixa).toHaveAccessibleDescription(/nunca em um computador compartilhado/);
  });

  it("mostra o link de volta ao login e o de acessibilidade", () => {
    render(<Tela />);

    expect(screen.getByRole("link", { name: /Voltar para o login/ })).toHaveAttribute("href", "/entrar");
    expect(screen.getByRole("link", { name: "Configurações de acessibilidade" })).toBeInTheDocument();
  });
});

describe("confirmar o código", () => {
  it("vazio ou incompleto: avisa no campo e nem chama o servidor", async () => {
    render(<Tela />);

    confirmar();
    expect(await screen.findByText("Digite os 6 números que enviamos por e-mail.")).toBeInTheDocument();

    digitar("123");
    confirmar();

    expect(await screen.findByText("Digite os 6 números que enviamos por e-mail.")).toBeInTheDocument();
    expect(concluirLogin).not.toHaveBeenCalled();
    expect(campo()).toHaveFocus();
  });

  it("código certo: manda o desafio, o código sem espaços e a escolha de lembrar; abre a sessão e segue para o destino", async () => {
    concluirLogin.mockResolvedValue({ token: "t", refreshToken: "r", usuario: {} });
    iniciarSessao.mockResolvedValue({ id: "u1", tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z" });
    render(<Tela />);

    digitar("123 456");
    fireEvent.click(screen.getByRole("checkbox", { name: "Lembrar este dispositivo" }));
    confirmar();

    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(concluirLogin).toHaveBeenCalledWith("desafio-de-teste", "123456", true);
    expect(iniciarSessao).toHaveBeenCalledOnce();
    expect(navegar.mock.calls[0][0]).toMatchObject({ replace: true });
    expect(lerVerificacao()).toBeNull();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("lembrado"));
  });

  it("sem marcar a caixa, NÃO pede para lembrar", async () => {
    concluirLogin.mockResolvedValue({ token: "t", refreshToken: "r", usuario: {} });
    iniciarSessao.mockResolvedValue({ id: "u1", tipo: "candidato", cadastroConcluidoEm: "2026-10-01T10:00:00Z" });
    render(<Tela />);

    digitar("123456");
    confirmar();

    await waitFor(() => expect(concluirLogin).toHaveBeenCalled());
    expect(concluirLogin.mock.calls[0][2]).toBe(false);
  });

  it("código errado: mostra o erro do servidor, limpa o campo, devolve o foco e MANTÉM o desafio", async () => {
    concluirLogin.mockRejectedValue(erroDoServidor("Código incorreto. Você ainda tem 4 tentativas.", "DISPOSITIVO_CODIGO_INVALIDO"));
    render(<Tela />);

    digitar("000000");
    confirmar();

    expect(await screen.findByText("Código incorreto. Você ainda tem 4 tentativas.")).toBeInTheDocument();
    expect(campo()).toHaveValue("");
    await waitFor(() => expect(campo()).toHaveFocus());
    expect(lerVerificacao()).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it("desafio vencido: avisa, apaga o desafio e volta ao login", async () => {
    concluirLogin.mockRejectedValue(erroDoServidor("O código expirou ou já foi usado.", "DISPOSITIVO_DESAFIO_EXPIRADO"));
    render(<Tela />);

    digitar("123456");
    confirmar();

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/entrar", replace: true }));
    expect(toast.error).toHaveBeenCalled();
    expect(lerVerificacao()).toBeNull();
  });

  it("5 erros: a mensagem aparece e o campo NÃO rouba o foco (o caminho agora é pedir outro código)", async () => {
    concluirLogin.mockRejectedValue(erroDoServidor("Muitas tentativas com código incorreto. Peça um novo código.", "DISPOSITIVO_TENTATIVAS_DEMAIS", 429));
    render(<Tela />);

    digitar("000000");
    confirmar();

    expect(await screen.findByText(/Muitas tentativas com código incorreto/)).toBeInTheDocument();
    expect(campo()).not.toHaveFocus();
  });

  it("conta pausada: o código já foi gasto; manda reativar no login", async () => {
    concluirLogin.mockResolvedValue({ contaPausada: true });
    iniciarSessao.mockResolvedValue({ contaPausada: true });
    render(<Tela />);

    digitar("123456");
    confirmar();

    expect(await screen.findByRole("heading", { level: 1, name: "Sua conta está pausada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/entrar");
  });

  it("a conta ganhou a verificação em duas etapas no meio: segue para a tela do TOTP com o desafio dela", async () => {
    concluirLogin.mockResolvedValue({ mfaNecessario: true, desafioMfa: "desafio-totp", metodosMfa: ["totp"] });
    iniciarSessao.mockResolvedValue({ mfaNecessario: true, desafioMfa: "desafio-totp", metodosMfa: ["totp"] });
    render(<Tela />);

    digitar("123456");
    confirmar();

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/verificacao-em-duas-etapas", replace: true }));
    expect(lerDesafio()?.desafio).toBe("desafio-totp");
  });

  it("não envia duas vezes com cliques seguidos", async () => {
    concluirLogin.mockReturnValue(new Promise(() => undefined));
    render(<Tela />);

    digitar("123456");
    const botao = screen.getByRole("button", { name: /Confirmar e entrar/ });
    fireEvent.submit(botao.closest("form") as HTMLFormElement);
    fireEvent.submit(botao.closest("form") as HTMLFormElement);

    await waitFor(() => expect(concluirLogin).toHaveBeenCalledTimes(1));
  });
});

describe("pedir outro código", () => {
  it("logo depois do envio, o botão fica desabilitado e diz quanto falta", () => {
    guardar(5);
    render(<Tela />);

    const botao = screen.getByRole("button", { name: /Pedir outro código em \d+ s/ });

    expect(botao).toBeDisabled();
  });

  it("passada a espera, o botão está liberado; pedir troca o desafio, renova o relógio e avisa que o anterior deixou de valer", async () => {
    reenviarCodigo.mockResolvedValue({ desafioDispositivo: "desafio-novo", reenvioEmSegundos: 60 });
    render(<Tela />);

    const botao = screen.getByRole("button", { name: "Não recebi: pedir outro código" });
    expect(botao).toBeEnabled();

    fireEvent.click(botao);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("anterior deixou de valer")));
    expect(reenviarCodigo).toHaveBeenCalledWith("desafio-de-teste");
    expect(lerVerificacao()?.desafio).toBe("desafio-novo");
    expect(await screen.findByRole("button", { name: /Pedir outro código em \d+ s/ })).toBeDisabled();
  });

  it("o servidor pediu para esperar mais: mostra a mensagem e trava o botão", async () => {
    reenviarCodigo.mockRejectedValue(erroDoServidor("Aguarde 30 segundos para pedir outro código.", "DISPOSITIVO_REENVIO_ESPERA", 429, { segundos: 30 }));
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: "Não recebi: pedir outro código" }));

    expect(await screen.findByText("Aguarde 30 segundos para pedir outro código.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Pedir outro código em \d+ s/ })).toBeDisabled();
  });

  it("desafio já vencido na hora de reenviar: volta ao login", async () => {
    reenviarCodigo.mockRejectedValue(erroDoServidor("A verificação expirou. Entre novamente.", "DISPOSITIVO_DESAFIO_EXPIRADO"));
    render(<Tela />);

    fireEvent.click(screen.getByRole("button", { name: "Não recebi: pedir outro código" }));

    await waitFor(() => expect(navegar).toHaveBeenCalledWith({ to: "/entrar", replace: true }));
    expect(lerVerificacao()).toBeNull();
  });
});
