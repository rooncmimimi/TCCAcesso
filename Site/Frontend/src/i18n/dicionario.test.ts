import { describe, expect, it } from "vitest";

import { DICIONARIOS } from "./dicionario";

/** Percorre os dicionários em paralelo e entrega cada caminho com o texto (ou função) de cada idioma. */
function percorrer(
  pt: unknown,
  outro: unknown,
  caminho: string,
  visitar: (caminho: string, pt: unknown, outro: unknown) => void,
) {
  if (pt && typeof pt === "object") {
    for (const chave of Object.keys(pt as Record<string, unknown>)) {
      percorrer(
        (pt as Record<string, unknown>)[chave],
        (outro as Record<string, unknown> | undefined)?.[chave],
        caminho ? `${caminho}.${chave}` : chave,
        visitar,
      );
    }
    return;
  }
  visitar(caminho, pt, outro);
}

/** Argumentos de exemplo para chamar as funções de texto (interpolação, plural). */
const EXEMPLOS: unknown[][] = [["Exemplo", "Outro", "Terceiro", "Quarto"], [1, 2], [2, 3]];

function chamar(fn: (...args: never[]) => unknown, args: unknown[]) {
  return fn(...(args.slice(0, fn.length) as never[]));
}

/**
 * Trechos iguais nos três idiomas que não são esquecimento (palavras que se escrevem igual em
 * português e espanhol, por exemplo). Só entra aqui o que foi conferido à mão.
 */
const IGUAIS_DE_PROPOSITO = new Set(["es|dashboard.formulario.minimo20", "es|sobre.rodape"]);

describe("dicionários de idioma", () => {
  for (const idioma of ["en", "es"] as const) {
    it(`${idioma}: nenhum texto vazio e funções devolvem texto`, () => {
      const problemas: string[] = [];
      percorrer(DICIONARIOS.pt, DICIONARIOS[idioma], "", (caminho, pt, outro) => {
        if (typeof pt === "string") {
          if (typeof outro !== "string" || outro.trim() === "") problemas.push(`${caminho}: vazio`);
        } else if (typeof pt === "function") {
          if (typeof outro !== "function") {
            problemas.push(`${caminho}: não é função`);
            return;
          }
          for (const args of EXEMPLOS) {
            const texto = chamar(outro as (...a: never[]) => unknown, args);
            // Algumas funções devolvem um texto; outras, partes de um texto (`{ antes, nome, depois }`).
            const partes = typeof texto === "object" && texto ? Object.values(texto) : [texto];
            if (partes.some((parte) => typeof parte !== "string" || parte.trim() === "")) {
              problemas.push(`${caminho}: função devolveu vazio`);
            }
          }
        }
      });
      expect(problemas).toEqual([]);
    });

    it(`${idioma}: frases longas não ficaram iguais ao português`, () => {
      const iguais: string[] = [];
      percorrer(DICIONARIOS.pt, DICIONARIOS[idioma], "", (caminho, pt, outro) => {
        if (typeof pt !== "string" || typeof outro !== "string") return;
        const palavras = pt.trim().split(/\s+/).length;
        if (palavras >= 4 && pt.length > 24 && pt === outro && !IGUAIS_DE_PROPOSITO.has(`${idioma}|${caminho}`)) {
          iguais.push(`${caminho}: ${pt}`);
        }
      });
      expect(iguais).toEqual([]);
    });
  }
});
