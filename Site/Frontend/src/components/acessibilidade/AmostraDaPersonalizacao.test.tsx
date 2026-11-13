import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { AmostraDaPersonalizacao } from "./AmostraDaPersonalizacao";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

/**
 * A amostra da personalização visual. Duas coisas importam aqui:
 *
 * 1. ela usa os componentes DE VERDADE, entao o que se ve e o que a tela vai fazer;
 * 2. ela nao fala. Quatro `role="alert"` numa pagina de configuracoes seriam quatro anuncios a cada
 *    vez que a pessoa abre a tela ou troca de padrao.
 */

afterEach(cleanup);

describe("a amostra mostra o que a personalizacao muda", () => {
  it("traz os tres status, cada um com texto e icone", () => {
    const { container } = render(<AmostraDaPersonalizacao />);
    const grupo = screen.getByText("Status de candidatura").parentElement!;

    for (const texto of ["Aprovada", "Em análise", "Rejeitada"]) {
      expect(within(grupo).getByText(texto)).toBeInTheDocument();
    }

    expect(within(grupo).getAllByText(/Aprovada|Em análise|Rejeitada/)).toHaveLength(3);
    expect(container.querySelectorAll("[data-variant] svg").length).toBeGreaterThanOrEqual(3);
  });

  it("traz os quatro avisos, um por significado", () => {
    const { container } = render(<AmostraDaPersonalizacao />);
    const variantes = [...container.querySelectorAll('[role="note"][data-variant]')].map(
      (n) => n.getAttribute("data-variant"),
    );

    expect(variantes).toEqual(["success", "warning", "info", "destructive"]);
  });

  it("os avisos de amostra NAO sao regiao ao vivo", () => {
    render(<AmostraDaPersonalizacao />);

    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });

  it("traz os tres botoes, que recebem foco para o contorno aparecer", () => {
    render(<AmostraDaPersonalizacao />);

    const botoes = screen.getAllByRole("button");

    expect(botoes).toHaveLength(3);
    for (const botao of botoes) expect(botao).not.toBeDisabled();
  });

  it("o campo com erro aponta para a mensagem, que tem texto e simbolo", () => {
    render(<AmostraDaPersonalizacao />);

    const campo = screen.getByLabelText("E-mail");

    expect(campo).toHaveAttribute("aria-invalid", "true");

    const idDaMensagem = campo.getAttribute("aria-describedby")!;
    const mensagem = document.getElementById(idDaMensagem)!;

    expect(mensagem).toHaveTextContent("Informe um e-mail válido.");
    expect(mensagem.querySelector("svg")).toBeTruthy();
  });

  it("a notificacao nao lida diz 'Nao lida', e nao so pinta uma bolinha", () => {
    render(<AmostraDaPersonalizacao />);

    expect(screen.getByText("Não lida")).toBeInTheDocument();
  });

  it("avisa que os graficos ainda nao acompanham o padrao", () => {
    render(<AmostraDaPersonalizacao />);

    expect(screen.getByText(/gráficos ainda não acompanham/i)).toBeInTheDocument();
  });

  it("axe nao acha violacao", async () => {
    const { container } = render(<AmostraDaPersonalizacao />);

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });
});
