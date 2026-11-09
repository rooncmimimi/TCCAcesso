import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CampoComDitado } from "./CampoComDitado";

/** Reconhecimento simulado: guarda a instância para o teste disparar resultados, erros e o fim. */
class ReconhecimentoFalso {
  static ultimo: ReconhecimentoFalso | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() {
    ReconhecimentoFalso.ultimo = this;
  }
  falar(texto: string, final = true) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: final, 0: { transcript: texto } }] });
  }
}

/** A sugestão é um item de lista com trechos em negrito: compara o texto inteiro do item. */
const sugestaoCom = (trecho: string, por: string) =>
  screen.queryByText((_, el) => el?.tagName === "LI" && (el.textContent ?? "").includes(`Trocar “${trecho}” por “${por}”`));

function renderizar(valor = "", aoMudar = vi.fn()) {
  render(<CampoComDitado id="campo" valor={valor} aoMudar={aoMudar} />);
  return aoMudar;
}

beforeEach(() => {
  ReconhecimentoFalso.ultimo = null;
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
});

describe("sem suporte do navegador", () => {
  it("não mostra botão que não funciona; explica o ditado do sistema", () => {
    renderizar();

    expect(screen.queryByRole("button", { name: /ditar/i })).not.toBeInTheDocument();
    expect(screen.getByText(/ditado do sistema/i)).toBeInTheDocument();
  });
});

describe("com suporte", () => {
  beforeEach(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: ReconhecimentoFalso, configurable: true });
  });

  it("NÃO liga o microfone sozinho", () => {
    renderizar();

    expect(ReconhecimentoFalso.ultimo).toBeNull();
    expect(screen.queryByText(/microfone ligado/i)).not.toBeInTheDocument();
  });

  it("liga só ao clicar, mostra o indicador e usa o idioma do site", () => {
    document.documentElement.lang = "en-US";
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));

    expect(ReconhecimentoFalso.ultimo?.start).toHaveBeenCalledTimes(1);
    expect(ReconhecimentoFalso.ultimo?.lang).toBe("en-US");
    expect(screen.getByText(/microfone ligado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /parar ditado/i })).toHaveAttribute("aria-pressed", "true");
    document.documentElement.lang = "";
  });

  it("o texto ouvido NÃO vai para o campo: abre a revisão, com sugestões, e só entra quando a pessoa confirma", () => {
    const aoMudar = renderizar("Olá. ");

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.falar("falo ingles e uso clt"));
    fireEvent.click(screen.getByRole("button", { name: /parar ditado/i }));

    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /revise o que foi ouvido/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/você pode corrigir o texto/i)).toHaveValue("falo ingles e uso clt");
    expect(sugestaoCom("ingles", "inglês")).toBeInTheDocument();
    expect(sugestaoCom("clt", "CLT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /inserir no campo/i }));

    // Sem aceitar nenhuma sugestão, entra exatamente o que foi ouvido.
    expect(aoMudar).toHaveBeenCalledWith("Olá. falo ingles e uso clt");
  });

  it("aceitar uma sugestão troca só aquele trecho, na revisão (o campo continua intocado)", () => {
    const aoMudar = renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.falar("falo ingles e uso clt"));
    fireEvent.click(screen.getByRole("button", { name: /parar ditado/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /^aceitar$/i })[0]);

    expect(screen.getByLabelText(/você pode corrigir o texto/i)).toHaveValue("falo inglês e uso clt");
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("'Manter como está' esconde a sugestão sem mexer no texto", () => {
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.falar("falo ingles"));
    fireEvent.click(screen.getByRole("button", { name: /parar ditado/i }));
    fireEvent.click(screen.getByRole("button", { name: /manter como está/i }));

    expect(sugestaoCom("ingles", "inglês")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/você pode corrigir o texto/i)).toHaveValue("falo ingles");
  });

  it("a pessoa pode editar o texto ouvido antes de inserir", () => {
    const aoMudar = renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.falar("texto ouvido errado"));
    fireEvent.click(screen.getByRole("button", { name: /parar ditado/i }));
    fireEvent.change(screen.getByLabelText(/você pode corrigir o texto/i), { target: { value: "texto corrigido por mim" } });
    fireEvent.click(screen.getByRole("button", { name: /inserir no campo/i }));

    expect(aoMudar).toHaveBeenCalledWith("texto corrigido por mim");
  });

  it("descartar não insere nada", () => {
    const aoMudar = renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.falar("não quero isso"));
    fireEvent.click(screen.getByRole("button", { name: /parar ditado/i }));
    fireEvent.click(screen.getByRole("button", { name: /^descartar$/i }));

    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: /revise/i })).not.toBeInTheDocument();
  });

  it("parar interrompe na hora e o indicador some", () => {
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    fireEvent.click(screen.getByRole("button", { name: /parar ditado/i }));

    expect(ReconhecimentoFalso.ultimo?.stop).toHaveBeenCalled();
    expect(screen.queryByText(/microfone ligado/i)).not.toBeInTheDocument();
  });

  it("microfone negado: avisa com palavras simples", () => {
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.onerror?.({ error: "not-allowed" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/não deixou usar o microfone/i);
  });

  it("avisa que o ACESSO não grava áudio e que o navegador pode usar um serviço online (não promete funcionar offline)", () => {
    renderizar();

    expect(screen.getByText(/não grava áudio/i)).toBeInTheDocument();
    expect(screen.getByText(/serviço online/i)).toBeInTheDocument();
  });

  it("ao sair da tela, a escuta é interrompida", () => {
    const { unmount } = render(<CampoComDitado id="campo2" valor="" aoMudar={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button", { name: /ditar texto/i })[0]);
    unmount();

    expect(ReconhecimentoFalso.ultimo?.abort).toHaveBeenCalled();
  });
});

/**
 * O relato era "o ditado não funciona mesmo tendo internet e navegador que suporta". Duas causas, as duas
 * invisíveis na tela: o navegador encerra a escuta sozinho no primeiro silêncio, e o microfone pode estar
 * bloqueado para o site sem que nada diga isso.
 */
describe("o que a pessoa vê quando o navegador atrapalha", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "SpeechRecognition", { value: ReconhecimentoFalso, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("o navegador encerra a escuta no silêncio e o ditado continua, sem abrir a revisão no meio da frase", () => {
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.falar("trabalho com atendimento"));

    // Chrome: fim de turno enquanto a pessoa pensa na frase seguinte.
    act(() => void ReconhecimentoFalso.ultimo!.onend?.());
    act(() => void vi.advanceTimersByTime(600));

    expect(screen.queryByRole("heading", { name: /revise/i })).not.toBeInTheDocument();
    expect(screen.getByText(/microfone ligado/i)).toBeInTheDocument();

    // E o que for dito depois do recomeço entra no mesmo texto.
    act(() => ReconhecimentoFalso.ultimo!.falar("e com público"));
    fireEvent.click(screen.getByRole("button", { name: /parar ditado/i }));

    expect(screen.getByLabelText(/você pode corrigir o texto/i)).toHaveValue("trabalho com atendimento e com público");
  });

  it("mostra o que já foi ouvido enquanto a pessoa fala: sem isso, parecia que o microfone tinha morrido", () => {
    renderizar();

    fireEvent.click(screen.getByRole("button", { name: /ditar texto/i }));
    act(() => ReconhecimentoFalso.ultimo!.falar("sou auxiliar administrativo"));

    expect(screen.getByText(/já ouvimos/i).closest("p")).toHaveTextContent("sou auxiliar administrativo");
  });

  it("diz que o microfone continua ligado nas pausas", () => {
    renderizar();

    expect(screen.getByText(/continua ligado nas pausas/i)).toBeInTheDocument();
  });

  it("microfone bloqueado no navegador: avisa antes de a pessoa tentar, e diz onde liberar", async () => {
    vi.useRealTimers();
    Object.defineProperty(navigator, "permissions", { value: { query: vi.fn().mockResolvedValue({ state: "denied" }) }, configurable: true });
    renderizar();

    expect(await screen.findByText(/microfone está bloqueado/i)).toHaveTextContent(/cadeado|permiss|ajustes/i);

    Reflect.deleteProperty(navigator, "permissions");
  });
});
