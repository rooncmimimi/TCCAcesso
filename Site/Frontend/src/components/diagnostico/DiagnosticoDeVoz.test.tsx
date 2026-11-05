import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/hooks/useLeituraDestacada", () => ({ useLeituraDestacada: () => ({ lendo: true, modo: "estimado" }) }));
vi.mock("@/components/acessibilidade/TextoOuvivel", () => ({ TextoOuvivel: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const { DiagnosticoDeVoz } = await import("./DiagnosticoDeVoz");

const original = { speech: (window as unknown as { speechSynthesis?: unknown }).speechSynthesis, clipboard: navigator.clipboard };

type VozFalsa = { name: string; lang: string; localService: boolean; default: boolean };

/** Voz simulada: `comportamento` diz o que ela faz ao falar (avisa palavras? pausa de verdade?). */
function instalarSintese(vozes: VozFalsa[], comportamento: { palavras?: boolean; pauseCancela?: boolean } = {}) {
  let atual: { onstart?: () => void; onend?: () => void; onboundary?: (e: { name: string; charIndex: number }) => void } | null = null;
  let pausado = false;

  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => vozes,
      speak: vi.fn((u: typeof atual) => {
        atual = u;
        queueMicrotask(() => {
          u?.onstart?.();
          if (comportamento.palavras) [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75].forEach((i) => u?.onboundary?.({ name: "word", charIndex: i }));
          // A frase curta do teste de palavras termina sozinha; a do teste de pausa só termina ao retomar.
          if ((u as unknown as { text: string }).text.includes("teste curto")) queueMicrotask(() => u?.onend?.());
        });
      }),
      cancel: vi.fn(),
      pause: vi.fn(() => {
        if (comportamento.pauseCancela) atual?.onend?.();
        else pausado = true;
      }),
      resume: vi.fn(() => {
        pausado = false;
        atual?.onend?.();
      }),
      get speaking() {
        return true;
      },
      get paused() {
        return pausado;
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
    voice: unknown = null;
    lang = "";
    onstart = null;
    onend = null;
    onerror = null;
    onboundary = null;
    constructor(public text: string) {}
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(document.documentElement, "lang", { configurable: true, value: "pt-BR" });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: original.speech });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: original.clipboard });
});

const VOZ_LOCAL: VozFalsa = { name: "Maria", lang: "pt-BR", localService: true, default: true };

describe("teste da leitura em voz alta: o que a pessoa vê", () => {
  it("abre com uma explicação curta e três etapas numeradas, sem termo técnico nem lista de vozes à mostra", () => {
    instalarSintese([VOZ_LOCAL]);
    render(<DiagnosticoDeVoz />);

    expect(screen.getByText(/Leva cerca de 1 minuto/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Etapa 1 de 3: ouça um trecho" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Etapa 2 de 3: pause e continue" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Etapa 3 de 3 (opcional): teste automático" })).toBeTruthy();

    const visivel = document.body.textContent ?? "";

    expect(visivel).not.toMatch(/boundary|evento|pause\(\)|medições/i);
    // A lista de vozes fica dentro de um bloco recolhido, não no meio do caminho.
    expect(screen.getByText(/Vozes instaladas neste aparelho \(1\)/).closest("details")?.hasAttribute("open")).toBe(false);
  });

  it("diz, em palavras de todo dia, como o ACESSO está marcando agora", () => {
    instalarSintese([VOZ_LOCAL]);
    render(<DiagnosticoDeVoz />);

    expect(screen.getByText("Agora, no ACESSO: a frase fica marcada e a palavra é estimada pelo tempo (aproximado).")).toBeTruthy();
  });

  it("as perguntas são botões de opção, e “Não testei” já vem escolhida", () => {
    instalarSintese([VOZ_LOCAL]);
    render(<DiagnosticoDeVoz />);

    const grupo = screen.getByRole("group", { name: "O que você viu enquanto a voz lia?" });

    expect(within(grupo).getAllByRole("radio")).toHaveLength(6);
    expect((within(grupo).getByRole("radio", { name: "Não testei" }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(within(grupo).getByRole("radio", { name: "Só a frase ficou marcada" }));
    expect((within(grupo).getByRole("radio", { name: "Só a frase ficou marcada" }) as HTMLInputElement).checked).toBe(true);
    expect((within(grupo).getByRole("radio", { name: "Não testei" }) as HTMLInputElement).checked).toBe(false);
  });

  it("sem leitura em voz no navegador, avisa e não deixa fazer o teste automático", () => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
    render(<DiagnosticoDeVoz />);

    expect(screen.getByRole("alert").textContent).toMatch(/não tem leitura em voz alta/);
    expect((screen.getByRole("button", { name: /Fazer o teste automático/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("teste automático: o resultado em português comum", () => {
  it("voz boa: explica que tudo está certo e que a marcação é exata", async () => {
    instalarSintese([VOZ_LOCAL], { palavras: true });
    render(<DiagnosticoDeVoz />);

    fireEvent.click(screen.getByRole("button", { name: /Fazer o teste automático/ }));

    // O resumo só vale depois dos dois testes: espera o último cartão aparecer.
    expect(await screen.findByText("Bom: Pausar e continuar funcionam", {}, { timeout: 20_000 })).toBeTruthy();
    expect(screen.getByText("Bom: A marcação das palavras é exata")).toBeTruthy();
    expect(screen.getByText("Tudo certo neste aparelho.")).toBeTruthy();
  }, 30_000);

  it("voz de rede que não avisa as palavras: Atenção, com o plano B explicado", async () => {
    instalarSintese([VOZ_LOCAL], { palavras: false });
    render(<DiagnosticoDeVoz />);

    fireEvent.click(screen.getByRole("button", { name: /Fazer o teste automático/ }));

    expect(await screen.findByText("Atenção: Esta voz não avisa em que palavra está", {}, { timeout: 20_000 })).toBeTruthy();
    expect(screen.getByText(/estima a palavra pelo tempo/)).toBeTruthy();
    expect(screen.getByText("Funciona, com limitações explicadas abaixo.")).toBeTruthy();
  }, 30_000);

  it("os números ficam em “Detalhes técnicos”, fechados", async () => {
    instalarSintese([VOZ_LOCAL], { palavras: true });
    render(<DiagnosticoDeVoz />);

    fireEvent.click(screen.getByRole("button", { name: /Fazer o teste automático/ }));
    await screen.findByText("Bom: Pausar e continuar funcionam", {}, { timeout: 20_000 });

    const detalhes = screen.getAllByText("Detalhes técnicos")[0].closest("details")!;

    expect(detalhes.hasAttribute("open")).toBe(false);
    expect(detalhes.textContent).toMatch(/palavras informadas/);
  }, 30_000);
});

describe("enviar o resultado", () => {
  it("o resultado inclui o que a pessoa marcou, e Copiar resultado o entrega ao navegador", async () => {
    instalarSintese([VOZ_LOCAL]);

    const escrever = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: escrever } });
    render(<DiagnosticoDeVoz />);

    fireEvent.click(screen.getByRole("radio", { name: "Só a frase ficou marcada" }));
    fireEvent.click(screen.getByRole("radio", { name: "Cortou a fala" }));
    fireEvent.change(screen.getByLabelText("Quer contar mais alguma coisa? (opcional)"), { target: { value: "Moto G, Chrome." } });

    const texto = (screen.getByLabelText("Resultado do teste de voz") as HTMLTextAreaElement).value;

    expect(texto).toContain("Destaque: Só a frase ficou marcada");
    expect(texto).toContain("Pausar: Cortou a fala");
    expect(texto).toContain("Comentário: Moto G, Chrome.");

    fireEvent.click(screen.getByRole("button", { name: "Copiar resultado" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Resultado copiado."));
    expect(escrever).toHaveBeenCalledWith(texto);
  });

  it("se a cópia for negada, diz como copiar à mão", async () => {
    instalarSintese([]);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("negado")) } });
    render(<DiagnosticoDeVoz />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar resultado" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/copie com o teclado/)));
  });

  it("a lista de vozes (recolhida) diz quais ficam no aparelho e quais usam a internet", () => {
    instalarSintese([VOZ_LOCAL, { name: "Google português do Brasil", lang: "pt-BR", localService: false, default: false }]);
    render(<DiagnosticoDeVoz />);

    expect(screen.getByText("2 em português (1 instaladas no aparelho, 1 que usam a internet).")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Google português do Brasil (pt-BR, usa a internet)" })).toBeTruthy();
  });
});

describe("acessibilidade da própria página", () => {
  it("passa na verificação automática (axe), inclusive depois do teste", async () => {
    instalarSintese([VOZ_LOCAL], { palavras: true });
    render(<DiagnosticoDeVoz />);
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /Fazer o teste automático/ }));
    await screen.findByText("Bom: Pausar e continuar funcionam", {}, { timeout: 20_000 });
    expect(await violacoesDeAcessibilidade(document.body)).toEqual([]);
  }, 30_000);
});
