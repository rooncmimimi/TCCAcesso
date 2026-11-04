import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aplicarRascunho,
  apagarRascunho,
  haQuantoTempo,
  lerRascunho,
  PREFIXO_DO_RASCUNHO,
  salvarRascunho,
  valoresAlterados,
  VALIDADE_DO_RASCUNHO,
} from "./rascunhoDeFormulario";

const CAMPOS = ["biografia", "titulo"] as const;

function formulario(html = "") {
  document.body.innerHTML = `<form id="f">
    <input name="titulo" type="text" value="Título original" />
    <textarea name="biografia">Bio original</textarea>
    <input name="email" type="text" value="a@b.com" />
    <input name="senha" type="password" value="segredo" />
    ${html}
  </form>`;
  return document.getElementById("f") as HTMLFormElement;
}

const campo = (form: HTMLFormElement, nome: string) => form.elements.namedItem(nome) as HTMLInputElement;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("valoresAlterados", () => {
  it("só entra o que a pessoa mudou em relação ao valor inicial", () => {
    const form = formulario();
    expect(valoresAlterados(form, CAMPOS)).toEqual({});

    campo(form, "biografia").value = "Bio nova";
    expect(valoresAlterados(form, CAMPOS)).toEqual({ biografia: "Bio nova" });
  });

  it("nunca olha campos fora da lista permitida, nem senha nem e-mail", () => {
    const form = formulario();
    campo(form, "email").value = "outro@b.com";
    campo(form, "senha").value = "novasenha";
    campo(form, "biografia").value = "Mudou";

    expect(valoresAlterados(form, CAMPOS)).toEqual({ biografia: "Mudou" });
    expect(Object.keys(valoresAlterados(form, ["email", "senha", "biografia"]))).not.toContain("senha");
  });

  it("campo apagado (vazio) não vira rascunho", () => {
    const form = formulario();
    campo(form, "biografia").value = "   ";

    expect(valoresAlterados(form, CAMPOS)).toEqual({});
  });
});

describe("salvarRascunho e lerRascunho", () => {
  it("guarda só o que mudou, com a hora, e lê de volta", () => {
    const form = formulario();
    campo(form, "titulo").value = "Novo título";

    expect(salvarRascunho("perfil:u1", form, CAMPOS, 1_000)).toBe(true);

    expect(lerRascunho("perfil:u1", 2_000)).toEqual({ salvoEm: 1_000, valores: { titulo: "Novo título" } });
    expect(window.localStorage.getItem(`${PREFIXO_DO_RASCUNHO}perfil:u1`)).not.toContain("Bio original");
  });

  it("voltar ao valor inicial apaga o rascunho em vez de guardar uma cópia sem mudança", () => {
    const form = formulario();
    campo(form, "titulo").value = "Mudou";
    salvarRascunho("k", form, CAMPOS, 1_000);

    campo(form, "titulo").value = "Título original";

    expect(salvarRascunho("k", form, CAMPOS, 2_000)).toBe(false);
    expect(lerRascunho("k", 3_000)).toBeNull();
  });

  it("vence em 24 horas e é apagado ao vencer", () => {
    const form = formulario();
    campo(form, "titulo").value = "Mudou";
    salvarRascunho("k", form, CAMPOS, 1_000);

    expect(lerRascunho("k", 1_000 + VALIDADE_DO_RASCUNHO)).not.toBeNull();
    expect(lerRascunho("k", 1_000 + VALIDADE_DO_RASCUNHO + 1)).toBeNull();
    expect(window.localStorage.getItem(`${PREFIXO_DO_RASCUNHO}k`)).toBeNull();
  });

  it("data no futuro (relógio mudado) ou conteúdo corrompido não valem", () => {
    window.localStorage.setItem(`${PREFIXO_DO_RASCUNHO}k`, JSON.stringify({ salvoEm: 10_000, valores: { a: "b" } }));
    expect(lerRascunho("k", 5_000)).toBeNull();

    window.localStorage.setItem(`${PREFIXO_DO_RASCUNHO}k`, "{quebrado");
    expect(lerRascunho("k")).toBeNull();

    window.localStorage.setItem(`${PREFIXO_DO_RASCUNHO}k`, JSON.stringify({ salvoEm: 1, valores: { a: 5 } }));
    expect(lerRascunho("k", 2)).toBeNull();
  });

  it("chaves diferentes não se misturam", () => {
    const form = formulario();
    campo(form, "titulo").value = "Mudou";
    salvarRascunho("perfil:u1", form, CAMPOS, 1_000);

    expect(lerRascunho("perfil:u2", 2_000)).toBeNull();
  });

  it("sem localStorage, não quebra", () => {
    const form = formulario();
    campo(form, "titulo").value = "Mudou";
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("cheio", "QuotaExceededError");
    });

    expect(salvarRascunho("k", form, CAMPOS)).toBe(false);
  });
});

describe("aplicarRascunho", () => {
  it("coloca nos campos permitidos, dispara input e conta quantos preencheu", () => {
    const form = formulario();
    const aoDigitar = vi.fn();
    form.addEventListener("input", aoDigitar);

    const n = aplicarRascunho(form, { salvoEm: 1, valores: { biografia: "Restaurada", titulo: "Título restaurado" } }, CAMPOS);

    expect(n).toBe(2);
    expect(campo(form, "biografia").value).toBe("Restaurada");
    expect(campo(form, "titulo").value).toBe("Título restaurado");
    expect(aoDigitar).toHaveBeenCalledTimes(2);
  });

  it("não aplica campo fora da lista, mesmo que esteja no rascunho (rascunho adulterado)", () => {
    const form = formulario();

    aplicarRascunho(form, { salvoEm: 1, valores: { email: "invasor@x.com", senha: "x" } }, CAMPOS);

    expect(campo(form, "email").value).toBe("a@b.com");
    expect(campo(form, "senha").value).toBe("segredo");
  });
});

describe("apagarRascunho", () => {
  it("remove só o rascunho pedido", () => {
    window.localStorage.setItem(`${PREFIXO_DO_RASCUNHO}a`, "x");
    window.localStorage.setItem(`${PREFIXO_DO_RASCUNHO}b`, "y");

    apagarRascunho("a");

    expect(window.localStorage.getItem(`${PREFIXO_DO_RASCUNHO}a`)).toBeNull();
    expect(window.localStorage.getItem(`${PREFIXO_DO_RASCUNHO}b`)).toBe("y");
  });
});

describe("haQuantoTempo", () => {
  it.each([
    [0, "agora há pouco"],
    [30_000, "agora há pouco"],
    [60_000, "há 1 minuto"],
    [12 * 60_000, "há 12 minutos"],
    [60 * 60_000, "há 1 hora"],
    [3 * 60 * 60_000, "há 3 horas"],
  ])("%d ms atrás: %s", (atras, esperado) => {
    expect(haQuantoTempo(1_000_000, 1_000_000 + atras)).toBe(esperado);
  });
});
