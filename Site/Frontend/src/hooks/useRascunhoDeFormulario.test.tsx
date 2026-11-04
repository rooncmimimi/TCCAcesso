import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AvisoDeRascunho } from "@/components/acessibilidade/AvisoDeRascunho";
import { lerRascunho, PREFIXO_DO_RASCUNHO } from "@/lib/rascunhoDeFormulario";
import { ESPERA_DO_RASCUNHO_MS, useRascunhoDeFormulario } from "./useRascunhoDeFormulario";

const CAMPOS = ["biografia"] as const;

function Formulario({ ativo = true, chave = "perfil:u1" }: { ativo?: boolean; chave?: string }) {
  const r = useRascunhoDeFormulario({ chave, campos: CAMPOS, ativo });
  return (
    <>
      <AvisoDeRascunho rascunho={r.rascunho} aoRestaurar={r.restaurar} aoDescartar={r.descartar} />
      <form ref={r.ref}>
        <textarea name="biografia" aria-label="Bio" defaultValue="Original" />
        <input name="senha" type="password" aria-label="Senha" />
        <button type="button" onClick={r.limpar}>
          Salvar de verdade
        </button>
      </form>
    </>
  );
}

const bio = () => screen.getByLabelText("Bio") as HTMLTextAreaElement;

function digitar(el: HTMLElement, valor: string) {
  act(() => {
    (el as HTMLTextAreaElement).value = valor;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useRascunhoDeFormulario", () => {
  it("grava o que a pessoa escreve, depois da espera, e só o campo permitido", () => {
    render(<Formulario />);

    digitar(bio(), "Escrevi bastante");
    digitar(screen.getByLabelText("Senha"), "minha-senha");
    expect(lerRascunho("perfil:u1")).toBeNull(); // ainda dentro da espera

    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_RASCUNHO_MS + 10);
    });

    expect(lerRascunho("perfil:u1")?.valores).toEqual({ biografia: "Escrevi bastante" });
    expect(window.localStorage.getItem(`${PREFIXO_DO_RASCUNHO}perfil:u1`)).not.toContain("minha-senha");
  });

  it("várias teclas seguidas gravam uma vez só, com o texto final", () => {
    const gravar = vi.spyOn(Storage.prototype, "setItem");
    render(<Formulario />);

    digitar(bio(), "a");
    digitar(bio(), "ab");
    digitar(bio(), "abc");
    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_RASCUNHO_MS + 10);
    });

    expect(gravar).toHaveBeenCalledTimes(1);
    expect(lerRascunho("perfil:u1")?.valores.biografia).toBe("abc");
  });

  it("ao abrir de novo, oferece o rascunho sem aplicar sozinho", () => {
    window.localStorage.setItem(
      `${PREFIXO_DO_RASCUNHO}perfil:u1`,
      JSON.stringify({ salvoEm: Date.now() - 5 * 60_000, valores: { biografia: "Texto de ontem" } }),
    );

    render(<Formulario />);

    expect(screen.getByRole("group", { name: "Rascunho encontrado" })).toBeTruthy();
    expect(screen.getByText(/há 5 minutos/)).toBeTruthy();
    expect(bio().value).toBe("Original"); // nada foi preenchido sozinho
  });

  it("Restaurar preenche o campo e some com o aviso", () => {
    window.localStorage.setItem(
      `${PREFIXO_DO_RASCUNHO}perfil:u1`,
      JSON.stringify({ salvoEm: Date.now(), valores: { biografia: "Texto de ontem" } }),
    );
    render(<Formulario />);

    act(() => screen.getByRole("button", { name: "Restaurar" }).click());

    expect(bio().value).toBe("Texto de ontem");
    expect(screen.queryByRole("group", { name: "Rascunho encontrado" })).toBeNull();
  });

  it("Descartar apaga o rascunho e deixa o campo como estava", () => {
    window.localStorage.setItem(
      `${PREFIXO_DO_RASCUNHO}perfil:u1`,
      JSON.stringify({ salvoEm: Date.now(), valores: { biografia: "Texto de ontem" } }),
    );
    render(<Formulario />);

    act(() => screen.getByRole("button", { name: "Descartar" }).click());

    expect(bio().value).toBe("Original");
    expect(lerRascunho("perfil:u1")).toBeNull();
    expect(screen.queryByRole("group", { name: "Rascunho encontrado" })).toBeNull();
  });

  it("limpar (depois de salvar de verdade) apaga o rascunho", () => {
    render(<Formulario />);
    digitar(bio(), "Vou salvar");
    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_RASCUNHO_MS + 10);
    });
    expect(lerRascunho("perfil:u1")).not.toBeNull();

    act(() => screen.getByRole("button", { name: "Salvar de verdade" }).click());

    expect(lerRascunho("perfil:u1")).toBeNull();
  });

  it("formulário fechado (ativo = falso) não oferece nem grava rascunho", () => {
    window.localStorage.setItem(
      `${PREFIXO_DO_RASCUNHO}perfil:u1`,
      JSON.stringify({ salvoEm: Date.now(), valores: { biografia: "Guardado" } }),
    );

    render(<Formulario ativo={false} />);
    digitar(bio(), "Digitei");
    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_RASCUNHO_MS + 10);
    });

    expect(screen.queryByRole("group", { name: "Rascunho encontrado" })).toBeNull();
    expect(lerRascunho("perfil:u1")?.valores.biografia).toBe("Guardado");
  });

  it("o rascunho de um usuário não aparece para outra chave", () => {
    window.localStorage.setItem(
      `${PREFIXO_DO_RASCUNHO}perfil:u1`,
      JSON.stringify({ salvoEm: Date.now(), valores: { biografia: "Do usuário 1" } }),
    );

    render(<Formulario chave="perfil:u2" />);

    expect(screen.queryByRole("group", { name: "Rascunho encontrado" })).toBeNull();
  });
});
