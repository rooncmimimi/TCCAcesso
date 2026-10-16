import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { webcrypto } from "node:crypto";

/**
 * O que o Site manda ao backend no fluxo do Google (achado 3): só o **hash** do segredo da aba na
 * ida, e o **segredo** na volta. O cliente HTTP é simulado; o `sessionStorage` e o SHA-256 são os de
 * verdade.
 */

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@/services/api", () => ({ default: { get, post } }));

const { googleService, perfilDaProvaGoogle } = await import("./google.service");
const { hashDoVinculo, lerVinculo, limparVinculo, ErroGoogleNavegador } = await import("@/lib/googleNavegador");

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
  get.mockResolvedValue({ data: { url: "https://accounts.google.com/x" } });
  post.mockResolvedValue({ data: { desfecho: "conflito", email: "ana@exemplo.com" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("urlDeAutorizacao", () => {
  it("devolve a URL do Google", async () => {
    await expect(googleService.urlDeAutorizacao()).resolves.toBe("https://accounts.google.com/x");
  });

  it("manda ao servidor o hash do segredo da aba, e nunca o segredo", async () => {
    await googleService.urlDeAutorizacao();

    const { vinculo } = get.mock.calls[0][1].params;
    const segredo = lerVinculo()!;
    expect(segredo).toBeTruthy();
    expect(vinculo).toBe(await hashDoVinculo(segredo));
    expect(vinculo).not.toBe(segredo);
    expect(JSON.stringify(get.mock.calls[0])).not.toContain(segredo);
  });

  it("repassa o tipoConta quando existe e o omite quando não", async () => {
    await googleService.urlDeAutorizacao("empresa");
    await googleService.urlDeAutorizacao();

    expect(get.mock.calls[0][1].params).toMatchObject({ tipoConta: "empresa" });
    expect(get.mock.calls[1][1].params).not.toHaveProperty("tipoConta");
  });

  it("cada chamada começa um fluxo novo, com outro segredo", async () => {
    await googleService.urlDeAutorizacao();
    await googleService.urlDeAutorizacao();

    expect(get.mock.calls[0][1].params.vinculo).not.toBe(get.mock.calls[1][1].params.vinculo);
  });

  it("não chama o servidor se o navegador não consegue guardar o segredo", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("cheio", "QuotaExceededError");
    });

    await expect(googleService.urlDeAutorizacao()).rejects.toBeInstanceOf(ErroGoogleNavegador);
    expect(get).not.toHaveBeenCalled();
  });
});

describe("concluir", () => {
  it("manda o código e o segredo da aba, para o servidor conferir contra o hash do código", async () => {
    await googleService.urlDeAutorizacao();
    const segredo = lerVinculo();

    await googleService.concluir("codigo-de-entrega");

    expect(post).toHaveBeenCalledWith("/auth/google/concluir", { codigo: "codigo-de-entrega", vinculo: segredo });
  });

  it("junta a confirmação de reativação só quando ela foi dada", async () => {
    await googleService.urlDeAutorizacao();

    await googleService.concluir("c", true);
    await googleService.concluir("c");

    expect(post.mock.calls[0][1]).toMatchObject({ confirmarReativacao: true });
    expect(post.mock.calls[1][1]).not.toHaveProperty("confirmarReativacao");
  });

  it("sem fluxo começado nesta aba, não inventa um segredo", async () => {
    limparVinculo();

    await googleService.concluir("c");

    expect(post.mock.calls[0][1].vinculo).toBeUndefined();
  });

  it("devolve a resposta do servidor", async () => {
    await expect(googleService.concluir("c")).resolves.toEqual({ desfecho: "conflito", email: "ana@exemplo.com" });
  });
});

describe("vincular", () => {
  it("manda o código e o segredo da aba, como o concluir", async () => {
    post.mockResolvedValue({ data: { usuario: { id: "u1" } } });
    await googleService.urlDeAutorizacao();
    const segredo = lerVinculo();

    await expect(googleService.vincular("codigo")).resolves.toEqual({ id: "u1" });

    expect(post).toHaveBeenCalledWith("/auth/google/vincular", { codigo: "codigo", vinculo: segredo });
  });
});

describe("perfilDaProvaGoogle", () => {
  const prova = (corpo: Record<string, unknown>) =>
    `cabecalho.${Buffer.from(JSON.stringify(corpo), "utf8").toString("base64url")}.assinatura`;

  it("lê nome e e-mail do corpo da prova", () => {
    expect(perfilDaProvaGoogle(prova({ perfil: { email: "ana@exemplo.com", nome: "Ana Souza", sub: "s" } }))).toEqual({
      email: "ana@exemplo.com",
      nome: "Ana Souza",
    });
  });

  it("mantém os acentos do nome (o corpo é UTF-8)", () => {
    expect(perfilDaProvaGoogle(prova({ perfil: { email: "j@exemplo.com", nome: "José Ângelo Müller" } }))?.nome).toBe(
      "José Ângelo Müller"
    );
  });

  it("devolve null nos campos que o Google não informou", () => {
    expect(perfilDaProvaGoogle(prova({ perfil: { email: null } }))).toEqual({ email: null, nome: null });
  });

  it.each([[undefined], [null], [""], ["lixo"], ["a.b.c"], [prova({})], [prova({ perfil: "texto" })]])(
    "devolve null para %j",
    (valor) => {
      expect(perfilDaProvaGoogle(valor as string | null | undefined)).toBeNull();
    }
  );

  it("não aceita e-mail ou nome que não sejam texto", () => {
    expect(perfilDaProvaGoogle(prova({ perfil: { email: 42, nome: { x: 1 } } }))).toEqual({ email: null, nome: null });
  });
});
