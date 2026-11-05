import { describe, expect, it } from "vitest";

import { aplicarSugestao, distancia, normalizar, sugerirCorrecoes } from "./vocabularioContextual";

const termos = (texto: string) => sugerirCorrecoes(texto).map((s) => [s.trecho, s.sugestao]);

describe("normalizar e distancia", () => {
  it("tira acento e maiúsculas", () => {
    expect(normalizar("Inglês")).toBe("ingles");
  });

  it("mede a distância de edição e corta quando passa do limite", () => {
    expect(distancia("proatividade", "proatividadi", 2)).toBe(1);
    expect(distancia("casa", "carro", 1)).toBe(2);
    expect(distancia("a", "abcdef", 2)).toBe(3);
  });
});

describe("sugerirCorrecoes: nunca troca nada sozinha, só sugere", () => {
  it("o mesmo termo escrito de outro jeito (sigla e acento)", () => {
    expect(termos("Trabalho com clt e falo ingles")).toEqual([
      ["clt", "CLT"],
      ["ingles", "inglês"]
    ]);
  });

  it("termo de duas palavras escrito junto vira separado", () => {
    expect(termos("Quero trabalhar em homeoffice")).toEqual([["homeoffice", "home office"]]);
  });

  it("um erro pequeno de reconhecimento perto de um termo do vocabulário", () => {
    expect(termos("Tenho muita proatividadi")).toEqual([["proatividadi", "proatividade"]]);
    expect(termos("Uso Excell todo dia")).toEqual([["Excell", "Excel"]]);
  });

  it("termo de várias palavras com erro pequeno", () => {
    expect(termos("Vaga de assistente administrativu")).toEqual([["assistente administrativu", "assistente administrativo"]]);
    expect(termos("Fui assistente administrativo e depois assistente administratívo")).toEqual([["assistente administratívo", "assistente administrativo"]]);
  });

  it("texto que já está certo não gera sugestão", () => {
    expect(termos("Trabalho com CLT, em home office, com Excel e inglês.")).toEqual([]);
  });

  it("só a caixa diferente de um termo em minúsculas não é erro (começo de frase)", () => {
    expect(termos("Presencial é melhor. Remoto também. HÍBRIDO serve.")).toEqual([]);
  });

  it("palavras comuns e curtas não ganham sugestão parecida", () => {
    expect(termos("Eu vou ao mar com a vaga de casa")).toEqual([]);
  });

  it("plural não é erro de reconhecimento", () => {
    expect(termos("Vejo as entrevistas e os currículos")).toEqual([]);
  });

  it("cada sugestão traz o motivo e o lugar exato", () => {
    const [s] = sugerirCorrecoes("Falo ingles bem");

    expect(s.inicio).toBe(5);
    expect(s.trecho).toBe("ingles");
    expect(s.motivo).toMatch(/costuma ser escrito assim/);
  });

  it("texto vazio não tem sugestão", () => {
    expect(sugerirCorrecoes("   ")).toEqual([]);
  });
});

describe("aplicarSugestao", () => {
  it("troca só o trecho aceito e mantém o resto do texto", () => {
    const texto = "Falo ingles e uso clt";
    const [primeira] = sugerirCorrecoes(texto);

    expect(aplicarSugestao(texto, primeira)).toBe("Falo inglês e uso clt");
  });

  it("se o texto mudou depois do cálculo, não troca no lugar errado", () => {
    const [s] = sugerirCorrecoes("Falo ingles");

    expect(aplicarSugestao("Fale inglês e depois ingles", s)).toBe("Fale inglês e depois ingles");
  });

  it("aceitar uma por vez e recalcular evita deslocar as outras", () => {
    let texto = "Falo ingles com clt";
    for (let i = 0; i < 5; i += 1) {
      const s = sugerirCorrecoes(texto)[0];
      if (!s) break;
      texto = aplicarSugestao(texto, s);
    }

    expect(texto).toBe("Falo inglês com CLT");
  });
});
