import { describe, expect, it } from "vitest";

import type { ResultadoDePalavras, ResultadoDePausa } from "@/lib/diagnosticoDeVoz";
import { RESUMO_POR_NIVEL, ROTULO_DO_NIVEL, explicarMarcacaoDasPalavras, explicarPausaEContinuar, piorNivel } from "@/lib/explicacaoDoDiagnostico";

const palavras = (extra: Partial<ResultadoDePalavras> = {}): ResultadoDePalavras => ({ situacao: "executado", totalDePalavras: 16, palavrasInformadas: 16, eventosDeFrase: 0, primeiroEventoMs: 150, terminou: true, ...extra });
const pausa = (extra: Partial<ResultadoDePausa> = {}): ResultadoDePausa => ({ situacao: "executado", marcouPausado: true, pausaCancelouAFala: false, retomouAteOFim: true, ...extra });

describe("explicarMarcacaoDasPalavras", () => {
  it("sem teste, não há o que explicar", () => {
    expect(explicarMarcacaoDasPalavras(null)).toBeNull();
  });

  it("voz que avisa as palavras: bom, em português comum", () => {
    const e = explicarMarcacaoDasPalavras(palavras())!;

    expect(e.nivel).toBe("bom");
    expect(e.titulo).toBe("A marcação das palavras é exata");
    expect(e.tecnico).toContain("16 de 16 palavras informadas; a primeira em 150 ms");
  });

  it("voz que avisa só parte: atenção", () => {
    const e = explicarMarcacaoDasPalavras(palavras({ palavrasInformadas: 6 }))!;

    expect(e.nivel).toBe("atencao");
    expect(e.significado).toMatch(/pular algumas palavras/);
  });

  it("voz que não avisa nenhuma: atenção (há o plano B aproximado), sem termo técnico no texto principal", () => {
    const e = explicarMarcacaoDasPalavras(palavras({ palavrasInformadas: 0, primeiroEventoMs: null }))!;

    expect(e.nivel).toBe("atencao");
    expect(e.significado).toMatch(/aproximada/);
    expect(e.tecnico).toContain("nenhum aviso de palavra chegou");
    expect(`${e.titulo} ${e.significado}`).not.toMatch(/boundary|evento|pause\(/i);
  });

  it("sem leitura em voz no navegador ou com erro da voz: não deu para saber", () => {
    expect(explicarMarcacaoDasPalavras(palavras({ situacao: "sem-voz" }))!.nivel).toBe("inconclusivo");
    expect(explicarMarcacaoDasPalavras(palavras({ situacao: "erro", erro: "synthesis-failed" }))!.tecnico).toContain("synthesis-failed");
  });
});

describe("explicarPausaEContinuar", () => {
  it("sem teste, não há o que explicar", () => {
    expect(explicarPausaEContinuar(null, null)).toBeNull();
  });

  it("funciona: bom", () => {
    expect(explicarPausaEContinuar(pausa(), palavras())!.nivel).toBe("bom");
  });

  it("a pausa corta a fala, mas a voz avisa as palavras: o ACESSO contorna (atenção)", () => {
    const e = explicarPausaEContinuar(pausa({ pausaCancelouAFala: true, retomouAteOFim: false }), palavras())!;

    expect(e.nivel).toBe("atencao");
    expect(e.significado).toMatch(/pausar corta a fala/);
    expect(e.significado).toMatch(/recomeça dali/);
  });

  it("a voz parou e não voltou, e a voz avisa as palavras: o ACESSO contorna (atenção)", () => {
    const e = explicarPausaEContinuar(pausa({ marcouPausado: true, retomouAteOFim: false }), palavras())!;

    expect(e.nivel).toBe("atencao");
    expect(e.significado).toMatch(/não voltou a falar/);
  });

  it("a pausa falha e a voz NÃO avisa as palavras: problema (o ACESSO não tem como recomeçar do ponto)", () => {
    const e = explicarPausaEContinuar(pausa({ pausaCancelouAFala: true, retomouAteOFim: false }), palavras({ palavrasInformadas: 0 }))!;

    expect(e.nivel).toBe("problema");
    expect(e.significado).toMatch(/não consegue recomeçar do ponto exato/);
  });

  it("a pausa falha e o teste das palavras ainda não rodou: atenção, pedindo para rodar também", () => {
    const e = explicarPausaEContinuar(pausa({ pausaCancelouAFala: true, retomouAteOFim: false }), null)!;

    expect(e.nivel).toBe("atencao");
    expect(e.significado).toMatch(/Rode também o teste da marcação/);
  });

  it("sem leitura em voz ou com erro: não deu para saber", () => {
    expect(explicarPausaEContinuar(pausa({ situacao: "sem-voz" }), null)!.nivel).toBe("inconclusivo");
    expect(explicarPausaEContinuar(pausa({ situacao: "erro", erro: "interrupted" }), null)!.tecnico).toContain("interrupted");
  });

  it("os números ficam em tecnico, não no texto principal", () => {
    const e = explicarPausaEContinuar(pausa({ pausaCancelouAFala: true, retomouAteOFim: false, estadoAoDesistir: { falando: true, pausado: false } }), palavras())!;

    expect(e.tecnico).toContain("falando=sim e pausado=não");
    expect(e.significado).not.toContain("falando=");
  });
});

describe("piorNivel e textos", () => {
  it("devolve o pior nível, ignorando o que não rodou", () => {
    const bom = explicarMarcacaoDasPalavras(palavras());
    const atencao = explicarMarcacaoDasPalavras(palavras({ palavrasInformadas: 0 }));
    const problema = explicarPausaEContinuar(pausa({ pausaCancelouAFala: true, retomouAteOFim: false }), palavras({ palavrasInformadas: 0 }));

    expect(piorNivel([null, null])).toBeNull();
    expect(piorNivel([bom, null])).toBe("bom");
    expect(piorNivel([bom, atencao])).toBe("atencao");
    expect(piorNivel([bom, atencao, problema])).toBe("problema");
  });

  it("todo nível tem rótulo e resumo", () => {
    for (const n of ["bom", "atencao", "problema", "inconclusivo"] as const) {
      expect(ROTULO_DO_NIVEL[n].length).toBeGreaterThan(2);
      expect(RESUMO_POR_NIVEL[n].length).toBeGreaterThan(10);
    }
  });
});
