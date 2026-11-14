import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { GraficosRelatorios } from "./GraficosRelatorios";
import { TabelaDoGrafico } from "./TabelaDoGrafico";
import { HachurasDeGrafico } from "./HachurasDeGrafico";
import { HACHURAS, idDaHachura, preenchimentoDaSerie } from "@/lib/hachuras";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * Os gráficos sem depender de enxergar cor: hachura por série, número escrito e os mesmos números
 * em tabela. O desenho do recharts não sai no jsdom (não há tamanho), mas o que importa aqui sai:
 * o rótulo que o leitor de tela ouve e a tabela, que ficam fora do SVG.
 */

const VISAO_GERAL = [
  { categoria: "Candidatos", total: 12 },
  { categoria: "Empresas", total: 5 },
];

const POR_STATUS = [
  { status: "em_analise", total: 7 },
  { status: "aprovada", total: 3 },
];

afterEach(cleanup);

describe("GraficosRelatorios", () => {
  it("o gráfico se anuncia como figura, com os números no rótulo", () => {
    render(<GraficosRelatorios visaoGeral={VISAO_GERAL} candidaturasPorStatus={POR_STATUS} />);

    const figuras = screen.getAllByRole("img");

    expect(figuras).toHaveLength(2);
    expect(figuras[0]).toHaveAccessibleName(/Candidatos: 12; Empresas: 5/);
  });

  it("a legenda e a tabela mostram o status traduzido, nunca a chave crua", () => {
    render(<GraficosRelatorios visaoGeral={VISAO_GERAL} candidaturasPorStatus={POR_STATUS} />);

    expect(screen.getByText("Em análise")).toBeInTheDocument();
    expect(screen.queryByText("em_analise")).not.toBeInTheDocument();
  });

  it("cada gráfico traz os mesmos números em tabela", () => {
    render(<GraficosRelatorios visaoGeral={VISAO_GERAL} candidaturasPorStatus={POR_STATUS} />);

    const tabelas = screen.getAllByRole("table");

    expect(tabelas).toHaveLength(2);
    expect(within(tabelas[0]).getByRole("rowheader", { name: "Candidatos" })).toBeInTheDocument();
    expect(within(tabelas[0]).getByText("12")).toBeInTheDocument();
  });

  it("sem candidaturas, mostra o aviso e não inventa gráfico nem tabela", () => {
    render(<GraficosRelatorios visaoGeral={VISAO_GERAL} candidaturasPorStatus={[]} />);

    expect(screen.getByText(/Ainda não há candidaturas/i)).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(1);
  });

  it("axe não acha violação", async () => {
    const { container } = render(
      <GraficosRelatorios visaoGeral={VISAO_GERAL} candidaturasPorStatus={POR_STATUS} />,
    );

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});

describe("TabelaDoGrafico", () => {
  it("soma o total no rodapé", () => {
    render(
      <TabelaDoGrafico
        titulo="Um título"
        colunaNome="Categoria"
        linhas={[
          { nome: "A", total: 4 },
          { nome: "B", total: 6 },
        ]}
      />,
    );

    const tabela = screen.getByRole("table");

    expect(within(tabela).getByRole("rowheader", { name: "Total" })).toBeInTheDocument();
    expect(within(tabela).getByText("10")).toBeInTheDocument();
  });

  it("o título fica na legenda da tabela, para quem ouve saber do que ela é", () => {
    const { container } = render(
      <TabelaDoGrafico titulo="Candidaturas por status" colunaNome="Status" linhas={[{ nome: "A", total: 1 }]} />,
    );

    expect(container.querySelector("caption")?.textContent).toBe("Candidaturas por status");
  });
});

describe("hachuras", () => {
  it("são cinco texturas diferentes, uma por série", () => {
    expect(HACHURAS).toHaveLength(5);
    expect(new Set(HACHURAS.map((h) => `${h.tipo}-${h.giro}`)).size).toBe(5);
  });

  it("o preenchimento aponta para a hachura da série", () => {
    expect(preenchimentoDaSerie("abc", 0)).toBe(`url(#${idDaHachura("abc", 0)})`);
  });

  it("série além da quinta volta ao começo, em vez de apontar para o nada", () => {
    expect(idDaHachura("abc", 5)).toBe(idDaHachura("abc", 0));
  });

  it("declara as cinco texturas, cada uma pintando a cor da sua série", () => {
    const { container } = render(
      <svg>
        <HachurasDeGrafico prefixo="teste" />
      </svg>,
    );

    const padroes = container.querySelectorAll("pattern");

    expect(padroes).toHaveLength(5);
    expect(padroes[0].querySelector("rect")?.getAttribute("fill")).toBe("var(--chart-1)");
    expect(padroes[4].querySelector("rect")?.getAttribute("fill")).toBe("var(--chart-5)");
  });

  it("a primeira série é sólida: a mais fácil de ler não ganha textura", () => {
    const { container } = render(
      <svg>
        <HachurasDeGrafico prefixo="teste" />
      </svg>,
    );

    const padroes = container.querySelectorAll("pattern");

    expect(padroes[0].querySelectorAll("path, circle")).toHaveLength(0);
    expect(padroes[1].querySelectorAll("path, circle").length).toBeGreaterThan(0);
  });
});
