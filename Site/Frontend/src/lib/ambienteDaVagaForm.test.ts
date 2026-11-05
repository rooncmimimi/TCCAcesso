import { describe, expect, it } from "vitest";

import { formularioDaVaga, formularioVazio, origensDoMapa, payloadDoAmbiente } from "./ambienteDaVagaForm";

describe("payloadDoAmbiente", () => {
  it("formulário vazio não manda valor nenhum (tudo é 'não informado')", () => {
    expect(payloadDoAmbiente(formularioVazio())).toEqual({ entrevistaAdaptacoes: [], entrevistaObservacao: null, ambienteSensorial: {}, acessibilidadeFisica: {} });
  });

  it("campo em branco some do objeto em vez de virar valor vazio", () => {
    const f = { ...formularioVazio(), sensorial: { ruido: "silencioso", iluminacao: "" }, fisico: { rampa: { situacao: "sim", detalhe: "  Na entrada " }, elevador: { situacao: "", detalhe: "texto solto" } } };

    const p = payloadDoAmbiente(f);

    expect(p.ambienteSensorial).toEqual({ ruido: "silencioso" });
    expect(p.acessibilidadeFisica).toEqual({ rampa: { situacao: "sim", detalhe: "Na entrada" } });
  });

  it("nunca envia a origem do mapa físico (quem decide é o servidor)", () => {
    const f = { ...formularioVazio(), fisico: { rampa: { situacao: "sim", detalhe: "" } } };

    expect(JSON.stringify(payloadDoAmbiente(f))).not.toMatch(/origem|verificado/);
  });

  it("a rotina entra na prévia sensorial só quando escrita", () => {
    expect(payloadDoAmbiente({ ...formularioVazio(), rotina: "  Das 9h às 15h  " }).ambienteSensorial).toEqual({ rotina: "Das 9h às 15h" });
    expect(payloadDoAmbiente({ ...formularioVazio(), rotina: "   " }).ambienteSensorial).toEqual({});
  });

  it("leva as adaptações da entrevista e a observação aparada", () => {
    const p = payloadDoAmbiente({ ...formularioVazio(), entrevista: ["legendas"], entrevistaObservacao: "  Avise 2 dias antes " });

    expect(p.entrevistaAdaptacoes).toEqual(["legendas"]);
    expect(p.entrevistaObservacao).toBe("Avise 2 dias antes");
  });
});

describe("formularioDaVaga", () => {
  const vaga = {
    entrevistaAdaptacoes: ["entrevista_por_texto"],
    entrevistaObservacao: "Por mensagem",
    ambienteSensorial: { ruido: "alto", rotina: "Das 9h às 17h" },
    acessibilidadeFisica: { rampa: { situacao: "sim" as const, origem: "verificado" as const, detalhe: "Entrada" } },
  };

  it("reconstrói o formulário a partir da vaga", () => {
    expect(formularioDaVaga(vaga)).toEqual({
      entrevista: ["entrevista_por_texto"],
      entrevistaObservacao: "Por mensagem",
      sensorial: { ruido: "alto" },
      rotina: "Das 9h às 17h",
      fisico: { rampa: { situacao: "sim", detalhe: "Entrada" } },
    });
  });

  it("vaga sem nada informado dá formulário vazio", () => {
    expect(formularioDaVaga({})).toEqual(formularioVazio());
  });

  it("ida e volta: o que a empresa não mexeu volta igual para a API", () => {
    const p = payloadDoAmbiente(formularioDaVaga(vaga));

    expect(p.acessibilidadeFisica).toEqual({ rampa: { situacao: "sim", detalhe: "Entrada" } });
    expect(p.ambienteSensorial).toEqual({ ruido: "alto", rotina: "Das 9h às 17h" });
  });
});

describe("origensDoMapa", () => {
  it("mostra de onde veio cada item, para o formulário avisar o que está verificado", () => {
    expect(origensDoMapa({ rampa: { situacao: "sim", origem: "verificado" }, elevador: { situacao: "nao", origem: "declarado" } })).toEqual({ rampa: "verificado", elevador: "declarado" });
    expect(origensDoMapa(null)).toEqual({});
  });
});
