import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { webcrypto } from "node:crypto";

import {
  corpoDoToken,
  ErroGoogleNavegador,
  guardarProva,
  hashDoVinculo,
  lerProva,
  lerVinculo,
  limparProva,
  limparVinculo,
  prepararVinculo,
} from "./googleNavegador";

/**
 * O que o navegador guarda do fluxo do Google: o segredo que amarra o retorno à aba que o começou e a
 * prova do cadastro. O `sessionStorage` é o do jsdom (de verdade); o `crypto.subtle` vem do Node,
 * que tem o mesmo SHA-256 do navegador.
 */

/** Monta um JWT só para o Site ler o corpo (a assinatura é conferida no servidor, não aqui). */
function jwtDeTeste(corpo: Record<string, unknown>) {
  const codificado = Buffer.from(JSON.stringify(corpo), "utf8").toString("base64url");
  return `cabecalho.${codificado}.assinatura`;
}

const emSegundos = (ms: number) => Math.floor(ms / 1000);

beforeEach(() => {
  window.sessionStorage.clear();
  // O jsdom não traz `crypto.subtle`; o do Node faz o mesmo SHA-256 do navegador.
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("hashDoVinculo", () => {
  // O mesmo valor conhecido que o teste do backend confere: Site e servidor têm de calcular o
  // mesmo hash, senão nenhum código seria aceito.
  it("é o SHA-256 em base64url, igual ao que o servidor calcula", async () => {
    await expect(hashDoVinculo("abc")).resolves.toBe("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  });

  it("tem sempre 43 caracteres e só letras, números, hífen e sublinhado", async () => {
    await expect(hashDoVinculo("qualquer coisa")).resolves.toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("prepararVinculo", () => {
  it("guarda um segredo na aba e devolve o hash dele", async () => {
    const hash = await prepararVinculo();

    const segredo = lerVinculo();
    expect(segredo).not.toBeNull();
    expect(await hashDoVinculo(segredo!)).toBe(hash);
  });

  it("o segredo tem 256 bits e não é o próprio hash que vai ao servidor", async () => {
    const hash = await prepararVinculo();
    const segredo = lerVinculo()!;

    // 32 bytes em base64url sem preenchimento = 43 caracteres.
    expect(segredo).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(segredo).not.toBe(hash);
  });

  it("cada clique gera um segredo novo e o anterior deixa de valer", async () => {
    const primeiro = await prepararVinculo();
    const segredoDoPrimeiro = lerVinculo();
    const segundo = await prepararVinculo();

    expect(segundo).not.toBe(primeiro);
    expect(lerVinculo()).not.toBe(segredoDoPrimeiro);
  });

  it("não começa o fluxo se a aba não consegue guardar o segredo", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("cheio", "QuotaExceededError");
    });

    await expect(prepararVinculo()).rejects.toBeInstanceOf(ErroGoogleNavegador);
  });

  it("não começa o fluxo se o navegador não tem criptografia (por exemplo, página sem HTTPS)", async () => {
    vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });

    const erro = await prepararVinculo().catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroGoogleNavegador);
    expect((erro as Error).message).toMatch(/e-mail e senha|outro navegador/);
    expect(lerVinculo()).toBeNull();
  });
});

describe("lerVinculo e limparVinculo", () => {
  it("devolve null quando este navegador não começou nenhum fluxo", () => {
    expect(lerVinculo()).toBeNull();
  });

  it("limpar apaga o segredo", async () => {
    await prepararVinculo();
    limparVinculo();
    expect(lerVinculo()).toBeNull();
  });

  it("não quebra quando o sessionStorage está bloqueado", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("bloqueado", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("bloqueado", "SecurityError");
    });

    expect(lerVinculo()).toBeNull();
    expect(() => limparVinculo()).not.toThrow();
  });
});

describe("prova do Google", () => {
  const perfil = { email: "ana@exemplo.com", nome: "Ana", sub: "sub-1" };

  it("devolve a prova guardada enquanto ela está dentro da validade", () => {
    const prova = jwtDeTeste({ perfil, exp: emSegundos(Date.now() + 10 * 60_000) });

    expect(guardarProva(prova)).toBe(true);
    expect(lerProva()).toBe(prova);
  });

  it("descarta, e apaga, a prova que já venceu", () => {
    guardarProva(jwtDeTeste({ perfil, exp: emSegundos(Date.now() - 1_000) }));

    expect(lerProva()).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it.each([["lixo"], ["a.b.c"], [jwtDeTeste({ perfil })]])("descarta a prova ilegível ou sem validade (%s)", (prova) => {
    guardarProva(prova);
    expect(lerProva()).toBeNull();
  });

  it("devolve null quando nunca foi guardada", () => {
    expect(lerProva()).toBeNull();
  });

  it("limpar apaga a prova", () => {
    guardarProva(jwtDeTeste({ perfil, exp: emSegundos(Date.now() + 60_000) }));
    limparProva();
    expect(lerProva()).toBeNull();
  });

  it("avisa, sem quebrar, quando a aba não deixa guardar", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("cheio", "QuotaExceededError");
    });

    expect(guardarProva("x.y.z")).toBe(false);
  });

  it("a prova e o segredo do vínculo são guardados separadamente", async () => {
    await prepararVinculo();
    guardarProva(jwtDeTeste({ perfil, exp: emSegundos(Date.now() + 60_000) }));

    limparVinculo();

    expect(lerVinculo()).toBeNull();
    expect(lerProva()).not.toBeNull();
  });
});

describe("corpoDoToken", () => {
  it("lê os acentos do nome como o servidor os escreveu (UTF-8), sem estragá-los", () => {
    const corpo = corpoDoToken(jwtDeTeste({ perfil: { nome: "José Ângela Müller", email: "jose@exemplo.com" } }));
    expect((corpo?.perfil as { nome: string }).nome).toBe("José Ângela Müller");
  });

  it.each([[""], ["sem-pontos"], ["a..c"], ["a.@@@.c"], [`a.${Buffer.from("42").toString("base64url")}.c`]])(
    "devolve null para %j (ilegível ou não é um objeto)",
    (token) => {
      expect(corpoDoToken(token)).toBeNull();
    }
  );
});
