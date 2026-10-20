import { describe, expect, it } from "vitest";

import { obterDocumento, VERSAO_DOCUMENTOS, type ChaveDocumento } from "@/dados/documentosLegais";
import { IDIOMAS } from "./tipos";

const CHAVES: ChaveDocumento[] = ["termos", "privacidade"];

/**
 * Os documentos legais em inglês e espanhol são traduções do texto em português. O tipo do
 * dicionário não obriga a mesma quantidade de seções e de itens, então este teste obriga: uma
 * tradução com item a menos diz menos do que o documento de referência diz.
 */
describe("documentos legais", () => {
  for (const chave of CHAVES) {
    describe(chave, () => {
      const referencia = obterDocumento(chave, "pt");

      for (const { codigo } of IDIOMAS) {
        it(`${codigo}: tem as mesmas seções e itens do texto de referência`, () => {
          const doc = obterDocumento(chave, codigo);
          expect(doc.secoes.map((s) => s.paragrafos.length)).toEqual(
            referencia.secoes.map((s) => s.paragrafos.length),
          );
          for (const [i, secao] of doc.secoes.entries()) {
            // A numeração dos títulos ("1. …") é a mesma nos três idiomas.
            expect(secao.titulo.match(/^\d+\./)?.[0]).toBe(referencia.secoes[i].titulo.match(/^\d+\./)?.[0]);
            for (const paragrafo of secao.paragrafos) expect(paragrafo.trim()).not.toBe("");
          }
        });

        it(`${codigo}: o resumo cita a versão aceita`, () => {
          expect(obterDocumento(chave, codigo).resumo).toContain(VERSAO_DOCUMENTOS);
        });
      }
    });
  }

  it("preserva o contato de privacidade em todos os idiomas", () => {
    for (const { codigo } of IDIOMAS) {
      for (const chave of CHAVES) {
        const texto = obterDocumento(chave, codigo)
          .secoes.flatMap((s) => s.paragrafos)
          .join(" ");
        expect(texto).toContain("projetoacessoinclusivo@gmail.com");
      }
    }
  });
});
