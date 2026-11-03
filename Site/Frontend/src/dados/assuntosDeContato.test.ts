import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ASSUNTOS_DE_CONTATO, LIMITES_DE_CONTATO } from "./assuntosDeContato";

/** Os assuntos e os limites do Fale conosco precisam ser os que a API aceita (`Backend/src/config/contato.js`). */

const servidor = readFileSync(resolve(__dirname, "../../../Backend/src/config/contato.js"), "utf8");

describe("Fale conosco: Site e API concordam", () => {
  it("os assuntos (chaves e rótulos) são os mesmos", () => {
    const bloco = servidor.match(/ASSUNTOS_DE_CONTATO = \{([\s\S]*?)\};/)![1];
    const doServidor = Object.fromEntries([...bloco.matchAll(/(\w+): "([^"]+)"/g)].map((m) => [m[1], m[2]]));

    expect(ASSUNTOS_DE_CONTATO).toEqual(doServidor);
  });

  it("os limites de tamanho são os mesmos", () => {
    const bloco = servidor.match(/LIMITES_DE_CONTATO = \{([\s\S]*?)\};/)![1];
    const doServidor = Object.fromEntries([...bloco.matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], Number(m[2])]));

    expect(LIMITES_DE_CONTATO).toEqual(doServidor);
  });
});
