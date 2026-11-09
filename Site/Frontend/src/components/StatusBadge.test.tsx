import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { StatusBadge } from "./StatusBadge";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * O selo de status não pode depender só da cor (WCAG 1.4.1): cada status tem texto E um ícone de
 * forma diferente. O ícone é decorativo de propósito — o texto já diz o status, e um leitor de tela
 * anunciando a imagem antes do texto só atrapalharia.
 *
 * Sem provedor de idioma o `t` cai no português, que é a fonte do dicionário.
 */

const STATUS = [
  ["pendente", "Pendente", "outline"],
  ["visualizada", "Visualizada", "secondary"],
  ["em_analise", "Em análise", "secondary"],
  ["aprovada", "Aprovada", "success"],
  ["rejeitada", "Rejeitada", "destructive"],
  ["cancelada", "Cancelada", "outline"],
  ["aberta", "Aberta", "success"],
  ["pausada", "Arquivada", "outline"],
  ["encerrada", "Encerrada", "secondary"],
] as const;

afterEach(cleanup);

describe("StatusBadge: texto e símbolo, nunca só a cor", () => {
  it.each(STATUS)("%s mostra o texto e um ícone", (status, texto) => {
    const { container } = render(<StatusBadge status={status} />);

    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it.each(STATUS)("%s usa a variante %s", (status, _texto, variante) => {
    const { container } = render(<StatusBadge status={status} />);

    expect(container.querySelector("[data-variant]")?.getAttribute("data-variant")).toBe(variante);
  });

  it("o ícone é escondido do leitor de tela, que ouve só o texto", () => {
    const { container } = render(<StatusBadge status="aprovada" />);
    const icone = container.querySelector("svg");

    expect(icone).toHaveAttribute("aria-hidden", "true");
    expect(container.textContent?.trim()).toBe("Aprovada");
  });

  it("aprovada e rejeitada se distinguem pela FORMA do ícone, não só pela cor", () => {
    const { container: aprovada } = render(<StatusBadge status="aprovada" />);
    const { container: rejeitada } = render(<StatusBadge status="rejeitada" />);

    const desenho = (raiz: HTMLElement) => raiz.querySelector("svg")?.innerHTML;

    expect(desenho(aprovada)).toBeTruthy();
    expect(desenho(aprovada)).not.toBe(desenho(rejeitada));
  });

  it("status desconhecido não inventa ícone nem rótulo", () => {
    const { container } = render(<StatusBadge status="estado_que_nao_existe" />);

    expect(screen.getByText("estado_que_nao_existe")).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });
});

describe("StatusBadge: os tons das tabelas administrativas", () => {
  it.each([
    ["sucesso", "success", 1],
    ["atencao", "warning", 1],
    ["perigo", "destructive", 1],
    // "Neutro" não afirma nada: não há o que simbolizar.
    ["neutro", "outline", 0],
  ] as const)("tom %s usa a variante %s", (tom, variante, icones) => {
    const { container } = render(<StatusBadge tom={tom}>Texto livre</StatusBadge>);

    expect(screen.getByText("Texto livre")).toBeInTheDocument();
    expect(container.querySelector("[data-variant]")?.getAttribute("data-variant")).toBe(variante);
    expect(container.querySelectorAll("svg")).toHaveLength(icones);
  });
});

describe("StatusBadge: axe", () => {
  it("não deixa violação no selo de cada status", async () => {
    const { container } = render(
      <ul>
        {STATUS.map(([status]) => (
          <li key={status}>
            <StatusBadge status={status} />
          </li>
        ))}
      </ul>,
    );

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});
