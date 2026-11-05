import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { violacoesDeAcessibilidade } from "@/lib/verificarAcessibilidade";

afterEach(cleanup);

/** Garante que o próprio verificador funciona: acha erros conhecidos e deixa passar HTML correto. */
describe("verificador de acessibilidade (axe)", () => {
  it("acha o que está errado: botão sem nome, imagem sem alternativa, campo sem rótulo", async () => {
    const { container } = render(
      <div>
        <button type="button" />
        <img src="x.png" />
        <input type="text" />
      </div>,
    );

    const regras = (await violacoesDeAcessibilidade(container)).map((v) => v.regra);

    expect(regras).toEqual(expect.arrayContaining(["button-name", "image-alt", "label"]));
  });

  it("deixa passar HTML correto", async () => {
    const { container } = render(
      <div>
        <h1>Título</h1>
        <label htmlFor="n">Nome</label>
        <input id="n" type="text" />
        <button type="button">Salvar</button>
        <img src="x.png" alt="Logotipo do ACESSO" />
      </div>,
    );

    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it("cada violação traz a regra, a explicação e onde está", async () => {
    const { container } = render(<button type="button" />);
    const [v] = await violacoesDeAcessibilidade(container);

    expect(v.regra).toBe("button-name");
    expect(v.ajuda.length).toBeGreaterThan(5);
    expect(v.elementos.length).toBeGreaterThan(0);
  });
});
