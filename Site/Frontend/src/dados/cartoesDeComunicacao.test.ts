import { describe, expect, it } from "vitest";

import { CARTOES_PADRAO, GRUPOS_DE_CARTOES } from "@/dados/cartoesDeComunicacao";

describe("cartões padrão", () => {
  it("trazem as frases pedidas e têm ids únicos e grupos conhecidos", () => {
    const textos = CARTOES_PADRAO.map((c) => c.texto);

    for (const esperado of ["Preciso de um momento para responder.", "Poderia repetir a pergunta?", "Prefiro responder por escrito.", "Não compreendi a instrução.", "Preciso de ajuda.", "Gostaria de solicitar uma adaptação.", "Preciso de uma pausa."]) {
      expect(textos).toContain(esperado);
    }

    expect(new Set(CARTOES_PADRAO.map((c) => c.id)).size).toBe(CARTOES_PADRAO.length);

    const grupos = GRUPOS_DE_CARTOES.map((g) => g.id);

    expect(CARTOES_PADRAO.every((c) => grupos.includes(c.grupo))).toBe(true);
    expect(grupos.every((g) => CARTOES_PADRAO.some((c) => c.grupo === g))).toBe(true);
  });
});
