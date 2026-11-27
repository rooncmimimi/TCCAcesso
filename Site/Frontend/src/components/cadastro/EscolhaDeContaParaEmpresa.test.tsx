import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * A pergunta de quem clica em "Sou empresa" sem estar logado. Antes, o clique levava direto ao cadastro
 * de candidato, e quem já tinha conta batia em "e-mail já cadastrado". Os dois caminhos precisam estar
 * à vista, e o de "já tenho conta" precisa levar a intenção (`depois=empresa`) até o login.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...resto }: { children: React.ReactNode; to: string; search?: Record<string, string> }) => (
    <a href={search ? `${to}?${new URLSearchParams(search).toString()}` : to} {...resto}>
      {children}
    </a>
  ),
}));

const { EscolhaDeContaParaEmpresa } = await import("./EscolhaDeContaParaEmpresa");

afterEach(cleanup);

describe("EscolhaDeContaParaEmpresa", () => {
  it("oferece entrar com a conta que já existe, levando a intenção de empresa", () => {
    render(<EscolhaDeContaParaEmpresa />);

    expect(screen.getByRole("link", { name: /Entrar e continuar/ })).toHaveAttribute("href", "/entrar?depois=empresa");
  });

  it("oferece criar a conta de candidato, também levando a intenção de empresa", () => {
    render(<EscolhaDeContaParaEmpresa />);

    expect(screen.getByRole("link", { name: /Criar minha conta de candidato/ })).toHaveAttribute(
      "href",
      "/cadastro/candidato?depois=empresa",
    );
  });

  it("tem um título e as duas opções como seções", () => {
    render(<EscolhaDeContaParaEmpresa />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("não deixa chave de tradução crua à mostra", () => {
    const { container } = render(<EscolhaDeContaParaEmpresa />);

    expect(container.textContent).not.toMatch(/cadastro\.empresa\./i);
  });

  it("não tem violação de acessibilidade", async () => {
    const { container } = render(<EscolhaDeContaParaEmpresa />);

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});
