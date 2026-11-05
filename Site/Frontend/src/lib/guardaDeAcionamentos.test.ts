import { beforeEach, describe, expect, it } from "vitest";

import { INTERVALO_DE_ENVIO_MS, REGISTRO_VAZIO, avaliarAcionamento, avaliarEnvio, controleAcionado } from "@/lib/guardaDeAcionamentos";

beforeEach(() => {
  document.body.innerHTML = `
    <button id="b1">Salvar</button>
    <button id="b2">Outro</button>
    <button id="mais" data-permite-repeticao>+</button>
    <div data-permite-repeticao><button id="dentro">−</button></div>
    <button id="off" disabled>Desligado</button>
    <a id="link" href="/x"><span id="texto-do-link">Ir</span></a>
    <a id="ancora">sem href</a>
    <input id="campo" type="text" />
    <input id="faixa" type="range" />
    <input id="marca" type="checkbox" />
    <div role="switch" id="sw"></div>
    <p id="par">texto</p>
    <form id="f1"></form>
    <div data-varredura-ignorar><button id="barra">Pausar</button></div>
  `;
});

const el = (id: string) => document.getElementById(id)!;

describe("controleAcionado", () => {
  it("acha o controle acionável, mesmo quando o clique cai num filho", () => {
    expect(controleAcionado(el("b1"))).toBe(el("b1"));
    expect(controleAcionado(el("texto-do-link"))).toBe(el("link"));
    expect(controleAcionado(el("marca"))).toBe(el("marca"));
    expect(controleAcionado(el("sw"))).toBe(el("sw"));
  });

  it("não vale para campo de texto, controle deslizante, texto solto nem link sem destino", () => {
    expect(controleAcionado(el("campo"))).toBeNull();
    expect(controleAcionado(el("faixa"))).toBeNull();
    expect(controleAcionado(el("par"))).toBeNull();
    expect(controleAcionado(el("ancora"))).toBeNull();
    expect(controleAcionado(null)).toBeNull();
  });

  it("respeita data-permite-repeticao, a barra da varredura e controles desligados", () => {
    expect(controleAcionado(el("mais"))).toBeNull();
    expect(controleAcionado(el("dentro"))).toBeNull();
    expect(controleAcionado(el("barra"))).toBeNull();
    expect(controleAcionado(el("off"))).toBeNull();
  });
});

describe("avaliarAcionamento", () => {
  it("o primeiro acionamento passa e o repetido dentro do intervalo é ignorado", () => {
    const a = avaliarAcionamento(REGISTRO_VAZIO, el("b1"), 1000, 700);

    expect(a.ignorar).toBe(false);

    const b = avaliarAcionamento(a.registro, el("b1"), 1300, 700);

    expect(b.ignorar).toBe(true);
  });

  it("outro controle nunca é afetado", () => {
    const a = avaliarAcionamento(REGISTRO_VAZIO, el("b1"), 1000, 700);

    expect(avaliarAcionamento(a.registro, el("b2"), 1050, 700).ignorar).toBe(false);
  });

  it("depois do intervalo, o mesmo controle volta a funcionar", () => {
    const a = avaliarAcionamento(REGISTRO_VAZIO, el("b1"), 1000, 700);

    expect(avaliarAcionamento(a.registro, el("b1"), 1700, 700).ignorar).toBe(false);
  });

  it("um clique ignorado não renova a janela (o terceiro clique, depois do tempo, passa)", () => {
    const a = avaliarAcionamento(REGISTRO_VAZIO, el("b1"), 1000, 700);
    const b = avaliarAcionamento(a.registro, el("b1"), 1500, 700);

    expect(b.ignorar).toBe(true);
    expect(b.registro).toBe(a.registro);
    expect(avaliarAcionamento(b.registro, el("b1"), 1750, 700).ignorar).toBe(false);
  });
});

describe("avaliarEnvio", () => {
  it(`ignora o segundo envio do mesmo formulário em menos de ${INTERVALO_DE_ENVIO_MS} ms`, () => {
    const a = avaliarEnvio(REGISTRO_VAZIO, el("f1"), 0);

    expect(a.ignorar).toBe(false);
    expect(avaliarEnvio(a.registro, el("f1"), INTERVALO_DE_ENVIO_MS - 1).ignorar).toBe(true);
    expect(avaliarEnvio(a.registro, el("f1"), INTERVALO_DE_ENVIO_MS).ignorar).toBe(false);
  });
});
