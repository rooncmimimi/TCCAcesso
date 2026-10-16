import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ErroGoogleNavegador } from "@/lib/googleNavegador";

/**
 * O botão "Continuar com Google" (achado 11 da auditoria): com o servidor "dormindo", a pergunta
 * "o Google está disponível?" falhava uma vez e o botão sumia sem aviso. Agora pergunta de novo, com
 * espera crescente, antes de desistir. O serviço e o aviso na tela são simulados; os relógios, falsos.
 */

const { disponivel, urlDeAutorizacao, avisoErro } = vi.hoisted(() => ({
  disponivel: vi.fn(),
  urlDeAutorizacao: vi.fn(),
  avisoErro: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: avisoErro, success: vi.fn() } }));
vi.mock("@/services/google.service", () => ({ default: { disponivel, urlDeAutorizacao } }));

const { BotaoGoogle } = await import("./BotaoGoogle");

const rotulo = () => screen.queryByRole("button", { name: /Continuar com Google/ });

/** Deixa as promessas pendentes terminarem e adianta os relógios falsos. */
const avancar = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("disponibilidade", () => {
  it("mostra o botão quando o servidor confirma que o Google está configurado", async () => {
    disponivel.mockResolvedValue(true);
    render(<BotaoGoogle />);

    await avancar(0);

    expect(rotulo()).toBeInTheDocument();
    expect(disponivel).toHaveBeenCalledTimes(1);
  });

  it("não mostra o botão, e não pergunta de novo, quando o Google não está configurado (resposta definitiva)", async () => {
    disponivel.mockResolvedValue(false);
    render(<BotaoGoogle />);

    await avancar(60_000);

    expect(rotulo()).not.toBeInTheDocument();
    expect(disponivel).toHaveBeenCalledTimes(1);
  });
});

describe("servidor acordando (achado 11)", () => {
  it("falha uma vez e, na nova tentativa, o botão aparece", async () => {
    disponivel.mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(true);
    render(<BotaoGoogle />);

    await avancar(0);
    expect(rotulo()).not.toBeInTheDocument();

    await avancar(2000);

    expect(rotulo()).toBeInTheDocument();
    expect(disponivel).toHaveBeenCalledTimes(2);
  });

  it("espera mais a cada tentativa (2 s, 4 s, 8 s, 16 s)", async () => {
    disponivel.mockRejectedValue(new Error("timeout"));
    render(<BotaoGoogle />);

    await avancar(0);
    expect(disponivel).toHaveBeenCalledTimes(1);

    await avancar(1999);
    expect(disponivel).toHaveBeenCalledTimes(1);
    await avancar(1);
    expect(disponivel).toHaveBeenCalledTimes(2);

    await avancar(3999);
    expect(disponivel).toHaveBeenCalledTimes(2);
    await avancar(1);
    expect(disponivel).toHaveBeenCalledTimes(3);

    await avancar(7999);
    expect(disponivel).toHaveBeenCalledTimes(3);
    await avancar(1);
    expect(disponivel).toHaveBeenCalledTimes(4);

    await avancar(15_999);
    expect(disponivel).toHaveBeenCalledTimes(4);
    await avancar(1);
    expect(disponivel).toHaveBeenCalledTimes(5);
  });

  it("desiste depois da última tentativa: sem botão e sem novas perguntas", async () => {
    disponivel.mockRejectedValue(new Error("fora do ar"));
    render(<BotaoGoogle />);

    await avancar(60_000);

    expect(disponivel).toHaveBeenCalledTimes(5);
    expect(rotulo()).not.toBeInTheDocument();

    await avancar(600_000);
    expect(disponivel).toHaveBeenCalledTimes(5);
  });

  it("o botão aparece mesmo quando só a última tentativa funciona", async () => {
    disponivel
      .mockRejectedValueOnce(new Error("a"))
      .mockRejectedValueOnce(new Error("b"))
      .mockRejectedValueOnce(new Error("c"))
      .mockRejectedValueOnce(new Error("d"))
      .mockResolvedValue(true);
    render(<BotaoGoogle />);

    await avancar(30_000);

    expect(rotulo()).toBeInTheDocument();
  });

  it("para de tentar quando a tela sai (não deixa uma pergunta pendurada)", async () => {
    disponivel.mockRejectedValue(new Error("timeout"));
    const { unmount } = render(<BotaoGoogle />);
    await avancar(0);

    unmount();
    await avancar(60_000);

    expect(disponivel).toHaveBeenCalledTimes(1);
  });
});

describe("ao clicar", () => {
  beforeEach(() => {
    disponivel.mockResolvedValue(true);
  });

  async function clicar() {
    render(<BotaoGoogle tipoConta="empresa" />);
    await avancar(0);
    fireEvent.click(screen.getByRole("button", { name: /Continuar com Google/ }));
    await avancar(0);
  }

  it("pede a URL já com o tipo de conta", async () => {
    urlDeAutorizacao.mockReturnValue(new Promise(() => undefined));

    await clicar();

    expect(urlDeAutorizacao).toHaveBeenCalledWith("empresa");
  });

  it("mostra a mensagem pronta quando o navegador não guarda o segredo da aba", async () => {
    urlDeAutorizacao.mockRejectedValue(new ErroGoogleNavegador());

    await clicar();

    expect(avisoErro).toHaveBeenCalledWith(expect.stringContaining("Este navegador não deixa"));
  });

  it("mostra a mensagem do servidor quando ele recusa", async () => {
    urlDeAutorizacao.mockRejectedValue({ response: { status: 503, data: { mensagem: "Entrar com Google não está configurado neste ambiente." } } });

    await clicar();

    expect(avisoErro).toHaveBeenCalledWith("Entrar com Google não está configurado neste ambiente.");
  });

  it("volta a poder clicar depois de um erro", async () => {
    urlDeAutorizacao.mockRejectedValue(new Error("rede"));

    await clicar();

    expect(screen.getByRole("button", { name: /Continuar com Google/ })).toBeEnabled();
  });
});
