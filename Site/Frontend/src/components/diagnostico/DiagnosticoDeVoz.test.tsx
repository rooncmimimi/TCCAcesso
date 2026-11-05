import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/hooks/useLeituraDestacada", () => ({ useLeituraDestacada: () => ({ lendo: true, modo: "estimado" }) }));
vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({ TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const { DiagnosticoDeVoz } = await import("./DiagnosticoDeVoz");

const original = { speech: (window as unknown as { speechSynthesis?: unknown }).speechSynthesis, clipboard: navigator.clipboard };

function instalarSintese(vozes: Array<{ name: string; lang: string; localService: boolean; default: boolean }>) {
  const ouvintes = new Map<string, () => void>();

  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => vozes,
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
      paused: false,
      addEventListener: (nome: string, f: () => void) => ouvintes.set(nome, f),
      removeEventListener: (nome: string) => ouvintes.delete(nome),
    },
  });
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
    voice: unknown = null;
    lang = "";
    constructor(public text: string) {}
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(document.documentElement, "lang", { configurable: true, value: "pt-BR" });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: original.speech });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: original.clipboard });
});

describe("diagnóstico de voz", () => {
  it("lista as vozes, diz quais são locais ou de rede e deixa escolher uma", () => {
    instalarSintese([
      { name: "Maria", lang: "pt-BR", localService: true, default: true },
      { name: "Google português do Brasil", lang: "pt-BR", localService: false, default: false },
      { name: "Alex", lang: "en-US", localService: true, default: false },
    ]);
    render(<DiagnosticoDeVoz />);

    expect(screen.getByText("3 vozes; 2 em português (1 locais, 1 de rede).")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Google português do Brasil (pt-BR, de rede)" })).toBeTruthy();
    expect(screen.getByLabelText("Voz para os testes")).toBeTruthy();
  });

  it("sem síntese de fala, avisa e não deixa rodar os testes", () => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    render(<DiagnosticoDeVoz />);

    expect(screen.getByRole("alert").textContent).toMatch(/não tem síntese de fala/);
    expect((screen.getByRole("button", { name: /Testar palavra por palavra/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Testar pausa e continuar/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("mostra o modo do destaque que está valendo na leitura de verdade", () => {
    instalarSintese([]);
    render(<DiagnosticoDeVoz />);

    expect(screen.getByText(/aproximado \(a palavra é estimada pelo tempo\)/)).toBeTruthy();
  });

  it("o relatório inclui o que a pessoa marcou e pode ser copiado", async () => {
    instalarSintese([{ name: "Maria", lang: "pt-BR", localService: true, default: true }]);

    const escrever = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: escrever } });
    render(<DiagnosticoDeVoz />);

    fireEvent.change(screen.getByLabelText("O destaque"), { target: { value: "Só a frase destacada" } });
    fireEvent.change(screen.getByLabelText("Ao apertar Pausar"), { target: { value: "Cortou a fala" } });
    fireEvent.change(screen.getByLabelText("Comentário (opcional)"), { target: { value: "Moto G, Chrome." } });

    const relatorio = (screen.getByLabelText("Relatório do diagnóstico de voz") as HTMLTextAreaElement).value;

    expect(relatorio).toContain("Destaque: Só a frase destacada");
    expect(relatorio).toContain("Pausar: Cortou a fala");
    expect(relatorio).toContain("Comentário: Moto G, Chrome.");
    expect(relatorio).toContain("1 em português (1 locais, 0 de rede)");

    fireEvent.click(screen.getByRole("button", { name: "Copiar relatório" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Relatório copiado."));
    expect(escrever).toHaveBeenCalledWith(relatorio);
  });

  it("se a cópia for negada, diz como copiar à mão", async () => {
    instalarSintese([]);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("negado")) } });
    render(<DiagnosticoDeVoz />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar relatório" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/copie com o teclado/)));
  });

  it("passa na verificação automática de acessibilidade (axe)", async () => {
    instalarSintese([{ name: "Maria", lang: "pt-BR", localService: true, default: true }]);
    render(<DiagnosticoDeVoz />);

    expect(await violacoesDeAcessibilidade(document.body)).toEqual([]);
  });
});
