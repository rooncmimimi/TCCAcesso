import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";

import { esquecerEstadoDoServidor, tradutorDoAcesso } from "@/i18n/tradutorDoAcesso";
import { traduzirTextos } from "@/services/traducao.service";
import { ErroDeTraducao } from "@/i18n/tradutorDoNavegador";

/**
 * O motor que fala com o servidor do ACESSO.
 *
 * O que estes testes seguram: cada falha do servidor vira o motivo certo na tela (cota acabada não é
 * a mesma coisa que servidor fora do ar), a resposta nunca é usada desalinhada com o pedido, e o 503
 * — "este servidor não tem tradução configurada" — não é perguntado de novo a cada clique.
 */

vi.mock("@/services/traducao.service", () => ({ traduzirTextos: vi.fn() }));

/** Um erro do axios com o status que o teste quiser, como o `clienteApi` devolveria. */
function erroComStatus(status: number): AxiosError {
  const erro = new AxiosError("falhou", "ERR_BAD_RESPONSE");

  erro.response = { status, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } };

  return erro;
}

beforeEach(() => {
  vi.clearAllMocks();
  esquecerEstadoDoServidor();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("o caminho feliz", () => {
  it("devolve os textos do servidor, na ordem", async () => {
    vi.mocked(traduzirTextos).mockResolvedValue({ textos: ["one", "two"], motor: "deepl", doCache: 1 });

    await expect(tradutorDoAcesso.traduzir(["um", "dois"], "pt", "en")).resolves.toEqual(["one", "two"]);
    expect(traduzirTextos).toHaveBeenCalledWith(["um", "dois"], "pt", "en");
  });

  it("o texto sai do aparelho, então a pessoa continua autorizando antes", async () => {
    await expect(tradutorDoAcesso.saiDoAparelho?.("pt", "en")).resolves.toBe(true);
  });

  it("não detecta idioma: quem faz isso é o palpite local", async () => {
    await expect(tradutorDoAcesso.detectar("qualquer coisa")).resolves.toBeNull();
  });
});

describe("cada falha vira o motivo certo", () => {
  const motivoDe = async (status: number) => {
    vi.mocked(traduzirTextos).mockRejectedValue(erroComStatus(status));

    return tradutorDoAcesso.traduzir(["olá"], "pt", "en").catch((erro: unknown) => (erro as ErroDeTraducao).codigo);
  };

  it("429 é cota ou limite: a tela diz para tentar depois", async () => {
    await expect(motivoDe(429)).resolves.toBe("limite_diario");
  });

  it("400 e 413 são texto grande demais", async () => {
    await expect(motivoDe(400)).resolves.toBe("texto_longo");
    await expect(motivoDe(413)).resolves.toBe("texto_longo");
  });

  it("sem resposta nenhuma é falta de rede", async () => {
    vi.mocked(traduzirTextos).mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"));

    await expect(tradutorDoAcesso.traduzir(["olá"], "pt", "en")).rejects.toMatchObject({ codigo: "sem_rede" });
  });

  it("500 é falha genérica, e o status não vira segredo", async () => {
    vi.mocked(traduzirTextos).mockRejectedValue(erroComStatus(500));

    await expect(tradutorDoAcesso.traduzir(["olá"], "pt", "en")).rejects.toMatchObject({
      codigo: "falhou",
      message: expect.stringContaining("500"),
    });
  });

  it("resposta com menos textos do que o pedido falha em vez de trocar um pelo outro", async () => {
    vi.mocked(traduzirTextos).mockResolvedValue({ textos: ["one"], motor: "deepl", doCache: 0 });

    await expect(tradutorDoAcesso.traduzir(["um", "dois"], "pt", "en")).rejects.toMatchObject({ codigo: "falhou" });
  });
});

describe("servidor sem tradução configurada (503)", () => {
  it("desliga o motor para o resto da aba, em vez de perguntar a cada clique", async () => {
    vi.mocked(traduzirTextos).mockRejectedValue(erroComStatus(503));

    expect(tradutorDoAcesso.disponivel()).toBe(true);

    await expect(tradutorDoAcesso.traduzir(["olá"], "pt", "en")).rejects.toThrow();

    expect(tradutorDoAcesso.disponivel()).toBe(false);

    // O segundo clique nem chega ao servidor: vai direto para a reserva.
    await expect(tradutorDoAcesso.traduzir(["olá"], "pt", "en")).rejects.toThrow();
    expect(traduzirTextos).toHaveBeenCalledTimes(1);
  });

  it("outras falhas NÃO desligam o motor: cota do mês volta no dia 1, queda passa", async () => {
    vi.mocked(traduzirTextos).mockRejectedValue(erroComStatus(429));

    await expect(tradutorDoAcesso.traduzir(["olá"], "pt", "en")).rejects.toThrow();

    expect(tradutorDoAcesso.disponivel()).toBe(true);
  });
});
