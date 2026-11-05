import { beforeEach, describe, expect, it } from "vitest";

import { PESO_POR_SEGUNDO_PADRAO, criarCronograma, criarRelogio, gravarRitmo, lerRitmo, novaCalibracao, palavraNoInstante, pesoDaPalavra } from "@/lib/leituraEstimada";

beforeEach(() => window.sessionStorage.clear());

describe("pesoDaPalavra", () => {
  it("letras valem 1, mais o espaço", () => {
    expect(pesoDaPalavra("casa")).toBe(5);
    expect(pesoDaPalavra("é")).toBe(2);
  });

  it("dígitos pesam mais (números se falam por extenso)", () => {
    expect(pesoDaPalavra("1500")).toBe(9);
  });

  it("pontuação final e vírgula acrescentam uma pausa", () => {
    expect(pesoDaPalavra("casa.")).toBeGreaterThan(pesoDaPalavra("casa,"));
    expect(pesoDaPalavra("casa,")).toBeGreaterThan(pesoDaPalavra("casa"));
  });
});

describe("criarCronograma", () => {
  const texto = "Você vai organizar a agenda.";

  it("uma entrada por palavra, com a pontuação final de fora do destaque", () => {
    const c = criarCronograma(texto, 15);

    expect(c.palavras.map((p) => texto.slice(p.inicio, p.fim))).toEqual(["Você", "vai", "organizar", "a", "agenda"]);
  });

  it("os instantes crescem, e o último é a duração total", () => {
    const c = criarCronograma(texto, 15);
    const tempos = c.palavras.map((p) => p.ate);

    expect([...tempos].sort((a, b) => a - b)).toEqual(tempos);
    expect(tempos[tempos.length - 1]).toBeCloseTo(c.duracaoMs, 5);
  });

  it("voz mais rápida (ritmo maior) ou velocidade maior encurtam a duração", () => {
    const base = criarCronograma(texto, 15).duracaoMs;

    expect(criarCronograma(texto, 30).duracaoMs).toBeLessThan(base);
    expect(criarCronograma(texto, 15, 2).duracaoMs).toBeCloseTo(base / 2, 3);
  });

  it("ritmo absurdo é limitado, e texto vazio não quebra", () => {
    expect(Number.isFinite(criarCronograma(texto, 0).duracaoMs)).toBe(true);
    expect(Number.isFinite(criarCronograma(texto, 99999).duracaoMs)).toBe(true);
    expect(criarCronograma("", 15).palavras).toEqual([]);
  });
});

describe("palavraNoInstante", () => {
  const texto = "Um dois três quatro cinco seis.";
  const c = criarCronograma(texto, 15);

  it("começa na primeira palavra e avança com o tempo", () => {
    const nome = (ms: number) => {
      const p = palavraNoInstante(c, ms)!;

      return texto.slice(p.inicio, p.fim);
    };

    expect(nome(0)).toBe("Um");
    expect(nome(-50)).toBe("Um");
    expect(nome(c.duracaoMs / 2)).toMatch(/três|quatro/);
    expect(nome(c.duracaoMs - 1)).toBe("seis");
  });

  it("depois do fim estimado, fica na última palavra (quem encerra é o fim real da fala)", () => {
    const p = palavraNoInstante(c, c.duracaoMs * 5)!;

    expect(texto.slice(p.inicio, p.fim)).toBe("seis");
  });

  it("sem palavras, não há o que destacar", () => {
    expect(palavraNoInstante(criarCronograma("", 15), 100)).toBeNull();
  });
});

describe("novaCalibracao", () => {
  it("aproxima o ritmo da medição, pela metade", () => {
    // 60 unidades em 3 s a velocidade 1 = 20 por segundo; antes era 10.
    expect(novaCalibracao(10, 60, 3000, 1)).toBe(15);
  });

  it("normaliza pela velocidade escolhida", () => {
    // Em 1,5x a mesma frase leva menos tempo; o ritmo medido volta à escala da velocidade 1.
    expect(novaCalibracao(20, 60, 2000, 1.5)).toBe(20);
  });

  it("descarta frase curta, tempo curto demais, tempo absurdo e medida fora da faixa", () => {
    expect(novaCalibracao(15, 10, 3000, 1)).toBeNull();
    expect(novaCalibracao(15, 60, 300, 1)).toBeNull();
    expect(novaCalibracao(15, 60, 120_000, 1)).toBeNull();
    expect(novaCalibracao(15, 200, 1000, 1)).toBeNull();
    expect(novaCalibracao(15, 60, 3000, 0)).toBeNull();
  });
});

describe("ritmo guardado na sessão", () => {
  it("sem nada guardado, o padrão; depois de gravar, o gravado", () => {
    expect(lerRitmo()).toBe(PESO_POR_SEGUNDO_PADRAO);

    gravarRitmo(22);
    expect(lerRitmo()).toBe(22);
  });

  it("valor corrompido ou fora da faixa volta ao padrão", () => {
    window.sessionStorage.setItem("acesso:voz:peso-por-segundo", "abc");
    expect(lerRitmo()).toBe(PESO_POR_SEGUNDO_PADRAO);

    window.sessionStorage.setItem("acesso:voz:peso-por-segundo", "9999");
    expect(lerRitmo()).toBe(PESO_POR_SEGUNDO_PADRAO);
  });
});

describe("criarRelogio", () => {
  it("conta o tempo e não conta o que ficou parado", () => {
    let agora = 1000;
    const relogio = criarRelogio(() => agora);

    agora = 1500;
    expect(relogio.decorridoMs()).toBe(500);

    relogio.pausar();
    agora = 5000;
    expect(relogio.decorridoMs()).toBe(500); // congelado

    relogio.retomar();
    agora = 5300;
    expect(relogio.decorridoMs()).toBe(800);
  });

  it("pausar duas vezes ou retomar sem pausar não bagunça a conta", () => {
    let agora = 0;
    const relogio = criarRelogio(() => agora);

    relogio.retomar();
    agora = 100;
    relogio.pausar();
    agora = 200;
    relogio.pausar();
    agora = 400;
    relogio.retomar();
    agora = 450;

    expect(relogio.decorridoMs()).toBe(150);
  });
});
