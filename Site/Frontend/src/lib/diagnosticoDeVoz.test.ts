import { describe, expect, it, vi } from "vitest";

import { contarPalavras, montarRelatorio, resumirVozes, testarEventosDePalavra, testarPausaNativa, type CriarEnunciado, type DadosDoRelatorio, type EnunciadoDeFala, type SintetizadorDeFala, type VozDoAparelho } from "@/lib/diagnosticoDeVoz";

/** Relógio de mentira: `esperar` avança a hora na hora, sem esperar de verdade. */
function relogioFalso() {
  let agora = 0;
  const pendentes: Array<() => void> = [];

  return {
    relogio: {
      agora: () => agora,
      esperar: (ms: number) =>
        new Promise<void>((resolver) => {
          agora += ms;
          pendentes.push(resolver);
          queueMicrotask(() => pendentes.shift()?.());
        }),
    },
    avancar: (ms: number) => {
      agora += ms;
    },
  };
}

const criar: CriarEnunciado = (_texto, voz) => ({ voice: voz, lang: "pt-BR", rate: 1, onstart: null, onend: null, onerror: null, onboundary: null });

type Comportamento = {
  /** Eventos de palavra a emitir ao falar (charIndex). */
  palavras?: number[];
  /** O pause() cancela a fala (Android). */
  pauseCancela?: boolean;
  /** Depois de resume(), a fala não termina nunca (voz de rede que trava). */
  travaAoRetomar?: boolean;
  /** A fala termina sozinha logo depois de começar? */
  terminaSozinha?: boolean;
};

function sintetizadorFalso(c: Comportamento = {}) {
  let atual: EnunciadoDeFala | null = null;
  let pausado = false;
  let falando = false;

  const s: SintetizadorDeFala = {
    speak: (u) => {
      atual = u;
      falando = true;
      queueMicrotask(() => {
        u.onstart?.();
        c.palavras?.forEach((i) => u.onboundary?.({ name: "word", charIndex: i }));
        if (c.terminaSozinha) {
          falando = false;
          u.onend?.();
        }
      });
    },
    cancel: () => {
      falando = false;
    },
    pause: () => {
      if (c.pauseCancela) {
        falando = false;
        atual?.onend?.();
        return;
      }
      pausado = true;
    },
    resume: () => {
      pausado = false;
      if (!c.travaAoRetomar) {
        falando = false;
        atual?.onend?.();
      }
    },
    get speaking() {
      return falando;
    },
    get paused() {
      return pausado;
    },
    getVoices: () => [],
  };

  return s;
}

const voz = (extra: Partial<VozDoAparelho> = {}): VozDoAparelho => ({ name: "Voz", lang: "pt-BR", localService: true, default: false, ...extra });

describe("resumirVozes", () => {
  it("conta as de português, as locais e as de rede, e acha a padrão", () => {
    const r = resumirVozes([voz({ name: "Maria", localService: true, default: true }), voz({ name: "Google português", localService: false }), voz({ name: "Alex", lang: "en-US" }), voz({ name: "Luciana", lang: "pt_BR" })]);

    expect(r).toEqual({ total: 4, portugues: 3, locaisEmPortugues: 2, deRedeEmPortugues: 1, padrao: "Maria" });
  });

  it("sem vozes, zera tudo", () => {
    expect(resumirVozes([])).toEqual({ total: 0, portugues: 0, locaisEmPortugues: 0, deRedeEmPortugues: 0, padrao: null });
  });
});

describe("testarEventosDePalavra", () => {
  const texto = "um dois três quatro";

  it("voz que informa as palavras: conta cada uma e mede o primeiro evento", async () => {
    const { relogio } = relogioFalso();
    const s = sintetizadorFalso({ palavras: [0, 3, 8, 13], terminaSozinha: true });
    const r = await testarEventosDePalavra(s, criar, voz(), texto, 15_000, relogio);

    expect(r).toMatchObject({ situacao: "executado", totalDePalavras: 4, palavrasInformadas: 4, terminou: true });
    expect(r.primeiroEventoMs).not.toBeNull();
  });

  it("voz sem eventos de palavra: zero informadas, e o teste termina pelo limite de tempo", async () => {
    const { relogio } = relogioFalso();
    const s = sintetizadorFalso({ palavras: [] });
    const r = await testarEventosDePalavra(s, criar, voz(), texto, 5000, relogio);

    expect(r).toMatchObject({ situacao: "executado", palavrasInformadas: 0, primeiroEventoMs: null, terminou: false });
  });

  it("depois de terminar, a espera de segurança atrasada NÃO cancela a fala do teste seguinte", async () => {
    let liberar: () => void = () => {};
    const relogio = {
      agora: () => 0,
      esperar: (ms: number) => (ms === 15_000 ? new Promise<void>((r) => (liberar = r)) : Promise.resolve()),
    };
    const s = sintetizadorFalso({ palavras: [0, 3, 8, 13], terminaSozinha: true });
    const cancelar = vi.spyOn(s, "cancel");

    await testarEventosDePalavra(s, criar, voz(), texto, 15_000, relogio);

    const chamadasAoTerminar = cancelar.mock.calls.length;

    liberar(); // 15 s depois, na vida real
    await Promise.resolve();
    await Promise.resolve();

    expect(cancelar.mock.calls.length).toBe(chamadasAoTerminar);
  });

  it("eventos repetidos para a mesma posição contam uma vez", async () => {
    const { relogio } = relogioFalso();
    const s = sintetizadorFalso({ palavras: [0, 0, 3, 3, 3], terminaSozinha: true });
    const r = await testarEventosDePalavra(s, criar, voz(), texto, 15_000, relogio);

    expect(r.palavrasInformadas).toBe(2);
  });

  it("sem síntese de fala no navegador, diz que não executou", async () => {
    const r = await testarEventosDePalavra(null, criar, null);

    expect(r.situacao).toBe("sem-voz");
  });

  it("erro da voz aparece no resultado", async () => {
    const { relogio } = relogioFalso();
    const s = sintetizadorFalso();

    s.speak = (u) => queueMicrotask(() => u.onerror?.({ error: "synthesis-failed" }));

    const r = await testarEventosDePalavra(s, criar, voz(), texto, 5000, relogio);

    expect(r).toMatchObject({ situacao: "erro", erro: "synthesis-failed" });
  });
});

describe("testarPausaNativa", () => {
  it("aparelho em que pause/resume funcionam", async () => {
    const { relogio } = relogioFalso();
    const r = await testarPausaNativa(sintetizadorFalso(), criar, voz(), undefined, relogio);

    expect(r).toMatchObject({ situacao: "executado", marcouPausado: true, pausaCancelouAFala: false, retomouAteOFim: true });
  });

  it("aparelho em que pause() cancela a fala (como no Chrome do Android)", async () => {
    const { relogio } = relogioFalso();
    const r = await testarPausaNativa(sintetizadorFalso({ pauseCancela: true }), criar, voz(), undefined, relogio);

    expect(r).toMatchObject({ pausaCancelouAFala: true, retomouAteOFim: false });
  });

  it("voz que trava ao retomar: pausou, mas não chegou ao fim", async () => {
    const { relogio } = relogioFalso();
    const r = await testarPausaNativa(sintetizadorFalso({ travaAoRetomar: true }), criar, voz(), undefined, relogio);

    expect(r).toMatchObject({ situacao: "executado", marcouPausado: true, pausaCancelouAFala: false, retomouAteOFim: false, estadoAoDesistir: { falando: true, pausado: false } });
    // O cancelamento final do próprio teste não vira erro nem estraga o veredito.
    expect(r.erro).toBeUndefined();
  });

  it("o cancelamento que o teste faz no fim não conta como erro da voz", async () => {
    const { relogio } = relogioFalso();
    const s = sintetizadorFalso({ travaAoRetomar: true });
    const cancelarOriginal = s.cancel;
    const falarOriginal = s.speak;
    let atualParaErro: EnunciadoDeFala | null = null;
    let emFala = false;

    s.speak = (u) => {
      emFala = true;
      falarOriginal(u);
    };
    s.cancel = () => {
      cancelarOriginal();
      // Como o Chrome: cancelar uma fala EM ANDAMENTO dispara `error: interrupted` (sem fala em andamento, nada).
      if (emFala) atualParaErro?.onerror?.({ error: "interrupted" });
    };

    const criarComRegistro: CriarEnunciado = (t, v) => (atualParaErro = criar(t, v));
    const r = await testarPausaNativa(s, criarComRegistro, voz(), undefined, relogio);

    expect(r.situacao).toBe("executado");
    expect(r.erro).toBeUndefined();
  });

  it("sem síntese de fala no navegador, diz que não executou", async () => {
    expect((await testarPausaNativa(null, criar, null)).situacao).toBe("sem-voz");
  });

  it("se a fala acaba antes do teste pausar, é inconclusivo", async () => {
    const { relogio } = relogioFalso();
    const r = await testarPausaNativa(sintetizadorFalso({ terminaSozinha: true }), criar, voz(), undefined, relogio);

    expect(r.situacao).toBe("erro");
  });
});

describe("contarPalavras", () => {
  it("conta pedaços separados por espaço", () => {
    expect(contarPalavras("  um   dois\ttrês \n")).toBe(3);
    expect(contarPalavras("")).toBe(0);
  });
});

describe("montarRelatorio", () => {
  const base: DadosDoRelatorio = {
    navegador: "Chrome 140 (Android)",
    plataforma: "Linux armv8l",
    idioma: "pt-BR",
    online: true,
    suporte: { sintese: true, destaquePorPalavra: true, reconhecimentoDeFala: true },
    vozes: { total: 5, portugues: 2, locaisEmPortugues: 1, deRedeEmPortugues: 1, padrao: "português do Brasil" },
    vozEscolhida: voz({ name: "Google português", localService: false }),
    palavras: { situacao: "executado", totalDePalavras: 15, palavrasInformadas: 0, eventosDeFrase: 0, primeiroEventoMs: null, terminou: true },
    pausa: { situacao: "executado", marcouPausado: false, pausaCancelouAFala: true, retomouAteOFim: false },
    observacoes: { destaque: "só a frase, palavra errada às vezes", pausa: "parou", continuar: "recomeçou do começo da frase", comentario: "  Testei no Wi-Fi.  " },
    quando: "2026-11-05 10:00",
  };

  it("junta suporte, vozes, as duas medições e o que a pessoa observou", () => {
    const t = montarRelatorio(base);

    expect(t).toContain("Navegador: Chrome 140 (Android)");
    expect(t).toContain("2 em português (1 locais, 1 de rede)");
    expect(t).toContain("Voz testada: Google português (pt-BR, de rede)");
    expect(t).toContain("0 de 15 palavras informadas; nenhum evento de palavra chegou");
    expect(t).toContain("esta voz NÃO informa as palavras (o ACESSO usa o destaque aproximado)");
    expect(t).toContain("pause() CANCELA a fala neste aparelho (a pausa por reinício do ACESSO é necessária)");
    expect(t).toContain("Comentário: Testei no Wi-Fi.");
  });

  it("mostra o estado do navegador quando a fala não volta", () => {
    const t = montarRelatorio({ ...base, pausa: { situacao: "executado", marcouPausado: true, pausaCancelouAFala: false, retomouAteOFim: false, estadoAoDesistir: { falando: true, pausado: false } } });

    expect(t).toContain("ao desistir, o navegador dizia falando=sim e pausado=não");
  });

  it("voz que informa as palavras e pausa que funciona", () => {
    const t = montarRelatorio({ ...base, palavras: { ...base.palavras!, palavrasInformadas: 15, primeiroEventoMs: 120 }, pausa: { situacao: "executado", marcouPausado: true, pausaCancelouAFala: false, retomouAteOFim: true } });

    expect(t).toContain("esta voz informa as palavras (destaque exato)");
    expect(t).toContain("pause() e resume() funcionam");
  });

  it("voz que informa só parte das palavras e pausa que trava ao retomar", () => {
    const t = montarRelatorio({ ...base, palavras: { ...base.palavras!, palavrasInformadas: 5 }, pausa: { situacao: "executado", marcouPausado: true, pausaCancelouAFala: false, retomouAteOFim: false } });

    expect(t).toContain("informa só parte das palavras");
    expect(t).toContain("trava ao continuar");
  });

  it("o que não foi executado ou informado aparece como tal, sem inventar", () => {
    const t = montarRelatorio({ ...base, palavras: null, pausa: null, vozEscolhida: null, observacoes: { destaque: "", pausa: "", continuar: "", comentario: "" } });

    expect(t).not.toContain("Teste de palavra por palavra");
    expect(t).toContain("a padrão do navegador");
    expect(t).toContain("Destaque: não informado");
    expect(t).toContain("Comentário: (nenhum)");
  });
});
