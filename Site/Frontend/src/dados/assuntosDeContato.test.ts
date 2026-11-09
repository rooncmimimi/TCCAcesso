import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ASSUNTOS_DE_CONTATO, LIMITES_DE_CONTATO } from "./assuntosDeContato";
import { DICIONARIOS } from "@/i18n/dicionarios";

/** Os assuntos e os limites do Fale conosco precisam ser os que a API aceita (`Backend/src/config/contato.js`). */

const servidor = readFileSync(resolve(__dirname, "../../../Backend/src/config/contato.js"), "utf8");

describe("Fale conosco: Site e API concordam", () => {
  // O que precisa bater são as CHAVES: é o que o Site envia e o que a API aceita. O rótulo, do lado do
  // Site, vem do dicionário (em três idiomas); no servidor ele é o texto do e-mail, em português.
  it("os assuntos são os mesmos (as chaves, que é o que a API aceita)", () => {
    const bloco = servidor.match(/ASSUNTOS_DE_CONTATO = \{([\s\S]*?)\};/)![1];
    const doServidor = [...bloco.matchAll(/(\w+): "([^"]+)"/g)].map((m) => m[1]);

    expect(Object.keys(ASSUNTOS_DE_CONTATO).sort()).toEqual(doServidor.sort());
  });

  it("cada assunto tem rótulo nos três idiomas", () => {
    for (const chave of Object.values(ASSUNTOS_DE_CONTATO)) {
      for (const idioma of ["pt", "en", "es"] as const) {
        expect(DICIONARIOS[idioma][chave], `${chave} em ${idioma}`).toBeTruthy();
      }
    }
  });

  it("os limites de tamanho são os mesmos", () => {
    const bloco = servidor.match(/LIMITES_DE_CONTATO = \{([\s\S]*?)\};/)![1];
    const doServidor = Object.fromEntries([...bloco.matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], Number(m[2])]));

    expect(LIMITES_DE_CONTATO).toEqual(doServidor);
  });
});
