import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Briefcase } from "lucide-react";

import { ListaCarregando, ListaComErro, ListaVazia } from "@/components/ui/estados-de-lista";
import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

afterEach(cleanup);

describe("estados de uma lista: o que o leitor de tela ouve", () => {
  it("carregando é anunciado com calma, e o esqueleto cinza não é lido", async () => {
    const { container } = render(<ListaCarregando rotulo="Carregando as vagas…" linhas={3} />);
    const status = screen.getByRole("status");

    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toBe("Carregando as vagas…");
    // Os retângulos cinzas são decoração: nada a dizer sobre eles.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it("o erro interrompe (role=alert), explica e oferece tentar de novo", async () => {
    const tentar = vi.fn();
    const { container } = render(<ListaComErro mensagem="Não foi possível carregar as vagas." aoTentarDeNovo={tentar} />);
    const alerta = screen.getByRole("alert");

    expect(alerta.textContent).toContain("Não foi possível carregar as vagas.");

    const botao = screen.getByRole("button", { name: "Tentar novamente" });

    fireEvent.click(botao);
    expect(tentar).toHaveBeenCalledTimes(1);
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it("a lista vazia é anunciada sem interromper, e o ícone não é lido", async () => {
    const { container } = render(<ListaVazia icone={Briefcase} mensagem="Nenhuma vaga publicada até o momento." />);

    expect(screen.getByRole("status").textContent).toBe("Nenhuma vaga publicada até o momento.");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it("sem ícone, continua anunciando a mensagem", () => {
    render(<ListaVazia mensagem="Nenhum resultado." />);

    expect(screen.getByRole("status").textContent).toBe("Nenhum resultado.");
  });
});
