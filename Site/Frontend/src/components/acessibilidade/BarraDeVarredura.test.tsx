import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { PREFERENCIAS_PADRAO, type PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

/**
 * Varredura com um botão, ponta a ponta no navegador simulado: o painel, o relógio, as teclas, os
 * grupos, o campo de texto e a saída (Esc). A página é um HTML pequeno; o que se confere é o que a
 * pessoa vê ("Agora: ...") e o que a varredura de fato aciona.
 */

const { estado } = vi.hoisted(() => ({ estado: { prefs: null as unknown as PreferenciasAcessibilidade, salvar: null as unknown as (p: PreferenciasAcessibilidade) => void } }));

vi.mock("@/hooks/useAcessibilidade", () => ({
  useAcessibilidade: () => ({ preferencias: estado.prefs, rascunho: estado.prefs, salvar: estado.salvar, definir: vi.fn() }),
}));

const { BarraDeVarredura } = await import("./BarraDeVarredura");

const PAGINA = `
  <main>
    <section aria-label="Filtros"><button id="aplicar">Aplicar</button><button id="limpar">Limpar</button></section>
    <button id="salvar">Salvar</button>
    <label for="nome">Nome</label><input id="nome" type="text" />
    <button id="decorativo"><svg aria-hidden="true"></svg></button>
  </main>
`;

const preferencias = (extra: Partial<PreferenciasAcessibilidade> = {}): PreferenciasAcessibilidade => ({ ...PREFERENCIAS_PADRAO, scanning: true, scanSpeed: 1.5, ...extra });

function montar(extra: Partial<PreferenciasAcessibilidade> = {}) {
  estado.prefs = preferencias(extra);
  document.body.innerHTML = PAGINA;

  return render(<BarraDeVarredura />);
}

const agora = () => document.querySelector("section[aria-label='Varredura com um botão'] p")?.textContent ?? "";
const iniciar = () => act(() => screen.getByRole("button", { name: "Iniciar varredura" }).click());
const avancarTempo = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const tecla = (key: string, alvo: Element = document.body) => act(() => void fireEvent.keyDown(alvo, { key }));

beforeEach(() => {
  vi.useFakeTimers();
  estado.salvar = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("painel", () => {
  it("com a varredura desligada nas preferências, não aparece nada", () => {
    montar({ scanning: false });

    expect(screen.queryByRole("button", { name: "Iniciar varredura" })).toBeNull();
  });

  it("ligada, mostra só o botão de iniciar e não anda sozinha", () => {
    montar();

    expect(screen.getByRole("button", { name: "Iniciar varredura" })).toBeTruthy();
    avancarTempo(5000);
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
  });

  it("iniciar mostra o primeiro item e anuncia o começo para leitores de tela", () => {
    montar({ scanGroups: false });
    iniciar();

    expect(agora()).toContain("Agora:");
    expect(agora()).toContain("Botão: Aplicar");
    expect(screen.getByRole("status").textContent).toMatch(/Varredura iniciada/);
  });

  it("o painel nunca é percorrido, e controles decorativos ficam de fora", () => {
    montar({ scanGroups: false });
    iniciar();

    const visitados: string[] = [];

    for (let i = 0; i < 8; i += 1) {
      visitados.push(agora());
      avancarTempo(1500);
    }

    const todos = visitados.join("|");

    expect(todos).toContain("Botão: Salvar");
    expect(todos).toContain("Campo: Nome");
    expect(todos).not.toMatch(/Pausar|Selecionar|Parar|Avançar/);
  });
});

describe("andar e selecionar", () => {
  it("avança sozinha no ritmo escolhido e dá a volta", () => {
    montar({ scanGroups: false, scanSpeed: 2 });
    iniciar();

    expect(agora()).toContain("Aplicar");
    avancarTempo(1900);
    expect(agora()).toContain("Aplicar");
    avancarTempo(200);
    expect(agora()).toContain("Limpar");
    avancarTempo(2000);
    expect(agora()).toContain("Salvar");
    avancarTempo(2000);
    expect(agora()).toContain("Nome");
    avancarTempo(2000);
    expect(agora()).toContain("Aplicar");
  });

  it("Espaço seleciona o item destacado: aciona o botão certo e o clique de Espaço não vaza para o botão focado", () => {
    montar({ scanGroups: false });

    const cliques: string[] = [];

    document.getElementById("salvar")!.addEventListener("click", () => cliques.push("salvar"));
    document.getElementById("aplicar")!.addEventListener("click", () => cliques.push("aplicar"));

    iniciar();
    avancarTempo(1500);
    avancarTempo(1500); // Salvar
    tecla(" ");

    expect(cliques).toEqual(["salvar"]);
    expect(screen.getByRole("status").textContent).toMatch(/Botão: Salvar acionado/);
  });

  it("Enter também seleciona, e uma tecla extra escolhida também", () => {
    montar({ scanGroups: false, scanKey: "F8" });

    const cliques: string[] = [];

    document.getElementById("aplicar")!.addEventListener("click", () => cliques.push("aplicar"));
    iniciar();
    tecla("Enter");
    tecla("F8");

    expect(cliques).toEqual(["aplicar", "aplicar"]);
  });

  it("pausar para o relógio e mantém o destaque; Avançar e Voltar andam item a item", () => {
    montar({ scanGroups: false });
    iniciar();
    act(() => screen.getByRole("button", { name: "Pausar" }).click());

    avancarTempo(10_000);
    expect(agora()).toContain("Pausada em:");
    expect(agora()).toContain("Aplicar");

    act(() => screen.getByRole("button", { name: "Avançar para o próximo item" }).click());
    expect(agora()).toContain("Limpar");
    act(() => screen.getByRole("button", { name: "Voltar ao item anterior" }).click());
    expect(agora()).toContain("Aplicar");

    act(() => screen.getByRole("button", { name: "Continuar" }).click());
    avancarTempo(1600);
    expect(agora()).toContain("Limpar");
  });

  it("com a varredura pausada, as setas andam e o anúncio acompanha o passo manual", () => {
    montar({ scanGroups: false });
    iniciar();
    act(() => screen.getByRole("button", { name: "Pausar" }).click());

    tecla("ArrowDown");
    expect(agora()).toContain("Limpar");
    expect(screen.getByRole("status").textContent).toBe("Botão: Limpar");
    tecla("ArrowUp");
    expect(agora()).toContain("Aplicar");
  });

  it("o botão Selecionar do painel faz o mesmo que a tecla (para quem usa mouse ou toque)", () => {
    montar({ scanGroups: false });

    const cliques: string[] = [];

    document.getElementById("aplicar")!.addEventListener("click", () => cliques.push("aplicar"));
    iniciar();
    act(() => screen.getByRole("button", { name: "Selecionar" }).click());

    expect(cliques).toEqual(["aplicar"]);
  });

  it("a velocidade muda pelo painel e fica salva", () => {
    montar({ scanGroups: false, scanSpeed: 1.5 });
    iniciar();
    act(() => screen.getByRole("button", { name: "Mais devagar" }).click());

    expect(estado.salvar).toHaveBeenCalledWith(expect.objectContaining({ scanSpeed: 1.8 }));
  });
});

describe("grupos", () => {
  it("o primeiro nível tem o grupo; selecioná-lo entra, e Esc sai; outro Esc para", () => {
    montar();
    iniciar();

    expect(agora()).toContain("Grupo: Filtros, 2 controles");

    tecla("Enter");
    expect(agora()).toContain("Botão: Aplicar");
    expect(screen.getByRole("button", { name: "Sair do grupo" })).toBeTruthy();

    avancarTempo(1500);
    expect(agora()).toContain("Botão: Limpar");
    avancarTempo(1500);
    expect(agora()).toContain("Botão: Aplicar"); // dá a volta só dentro do grupo

    tecla("Escape");
    expect(agora()).toContain("Grupo: Filtros");
    expect(screen.queryByRole("button", { name: "Sair do grupo" })).toBeNull();

    tecla("Escape");
    expect(screen.getByRole("button", { name: "Iniciar varredura" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Varredura parada/);
  });

  it("Parar encerra a qualquer momento", () => {
    montar();
    iniciar();
    act(() => screen.getByRole("button", { name: "Parar" }).click());

    expect(screen.getByRole("button", { name: "Iniciar varredura" })).toBeTruthy();
  });
});

describe("campo de texto", () => {
  it("selecionar um campo põe o foco nele e pausa; Esc devolve a varredura", () => {
    montar({ scanGroups: false });
    iniciar();
    avancarTempo(1500 * 3); // Nome

    expect(agora()).toContain("Campo: Nome");

    tecla("Enter");

    expect(document.activeElement?.id).toBe("nome");
    expect(agora()).toContain("Campo ativo");

    avancarTempo(10_000);
    expect(agora()).toContain("Campo ativo");

    tecla("Escape", document.getElementById("nome")!);
    expect(document.activeElement?.id).not.toBe("nome");
    expect(agora()).toContain("Agora:");
  });

  it("enquanto a pessoa digita no campo, Espaço e Enter são do texto e não selecionam nada", () => {
    montar({ scanGroups: false });

    const cliques: string[] = [];

    document.getElementById("aplicar")!.addEventListener("click", () => cliques.push("aplicar"));
    iniciar();

    const campo = document.getElementById("nome")!;

    campo.focus();
    tecla(" ", campo);
    tecla("Enter", campo);

    expect(cliques).toEqual([]);
  });
});

describe("a página muda durante a varredura", () => {
  it("um botão novo entra na varredura, e o item destacado é mantido", async () => {
    montar({ scanGroups: false });
    iniciar();
    avancarTempo(1500); // Limpar

    act(() => screen.getByRole("button", { name: "Pausar" }).click());

    await act(async () => {
      const novo = document.createElement("button");

      novo.textContent = "Novo botão";
      document.querySelector("main")!.prepend(novo);
      await Promise.resolve(); // o MutationObserver avisa em microtarefa
      vi.advanceTimersByTime(400);
    });

    // O destaque continua em Limpar, e o botão novo passou a fazer parte do caminho (antes de Aplicar).
    expect(agora()).toContain("Limpar");
    act(() => screen.getByRole("button", { name: "Voltar ao item anterior" }).click());
    expect(agora()).toContain("Aplicar");
    act(() => screen.getByRole("button", { name: "Voltar ao item anterior" }).click());
    expect(agora()).toContain("Novo botão");
  });

  it("se todos os controles somem, a varredura para e avisa", async () => {
    montar({ scanGroups: false });
    iniciar();

    await act(async () => {
      document.querySelector("main")!.remove();
      await Promise.resolve();
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByRole("button", { name: "Iniciar varredura" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Não há mais controles/);
  });

  it("sem controles na tela, não inicia e explica", () => {
    montar({ scanGroups: false });
    document.querySelector("main")!.remove();
    iniciar();

    expect(screen.getByRole("button", { name: "Iniciar varredura" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Não há controles/);
  });
});

describe("com um diálogo aberto", () => {
  it("a varredura percorre só o diálogo", () => {
    montar({ scanGroups: false });

    const dialogo = document.createElement("div");

    dialogo.setAttribute("role", "dialog");
    dialogo.setAttribute("data-state", "open");
    dialogo.innerHTML = `<button>Cancelar</button><button>Confirmar</button>`;
    document.body.appendChild(dialogo);

    iniciar();
    expect(agora()).toContain("Botão: Cancelar");
    avancarTempo(1500);
    expect(agora()).toContain("Botão: Confirmar");
    avancarTempo(1500);
    expect(agora()).toContain("Botão: Cancelar");
  });
});
