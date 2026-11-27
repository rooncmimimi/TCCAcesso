import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { textosDoCadastro } from "@/components/cadastro/idioma";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...resto }: { children: React.ReactNode; to: string; search?: Record<string, string | undefined> }) => {
    const consulta = new URLSearchParams(
      Object.entries(search ?? {}).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    return (
      <a href={consulta ? `${to}?${consulta}` : to} {...resto}>
        {children}
      </a>
    );
  },
}));

const { AvisoEmailJaCadastrado } = await import("./AvisoEmailJaCadastrado");

afterEach(cleanup);

describe("AvisoEmailJaCadastrado", () => {
  it("é anunciado como alerta e traz o caminho para entrar", () => {
    const t = textosDoCadastro("pt");
    render(<AvisoEmailJaCadastrado t={t} />);

    expect(screen.getByRole("alert")).toHaveTextContent(t.emailJaTemConta);
    expect(screen.getByRole("link", { name: t.entrarComEstaConta })).toHaveAttribute("href", "/entrar");
  });

  it("no caminho de empresa, o link de entrar leva a intenção junto", () => {
    render(<AvisoEmailJaCadastrado t={textosDoCadastro("pt")} depois="empresa" />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/entrar?depois=empresa");
  });

  it.each(["pt", "en", "es"] as const)("tem texto próprio em %s", (idioma) => {
    render(<AvisoEmailJaCadastrado t={textosDoCadastro(idioma)} />);

    expect(screen.getByRole("alert").textContent?.length).toBeGreaterThan(10);
  });
});
