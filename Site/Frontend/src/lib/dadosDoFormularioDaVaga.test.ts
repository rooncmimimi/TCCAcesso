import { describe, expect, it } from "vitest";

import { formularioVazio } from "./ambienteDaVagaForm";
import { avaliarVaga } from "./avaliadorDeVaga";
import { lerDadosParaAvaliar } from "./dadosDoFormularioDaVaga";

function formulario(campos: Record<string, string>) {
  const form = document.createElement("form");

  for (const [nome, valor] of Object.entries(campos)) {
    const campo = document.createElement("textarea");
    campo.name = nome;
    campo.value = valor;
    form.appendChild(campo);
  }

  return form;
}

describe("lerDadosParaAvaliar", () => {
  it("lê os campos de texto do formulário, aparados", () => {
    const dados = lerDadosParaAvaliar(formulario({ titulo: "  Analista ", descricao: "Texto", requisitos: "A; B", modalidade: "presencial", cidade: "Campinas", atividades: "Atender" }), { ambiente: formularioVazio(), recursos: [] });

    expect(dados).toMatchObject({ titulo: "Analista", descricao: "Texto", requisitos: "A; B", modalidade: "presencial", cidade: "Campinas", atividades: "Atender" });
  });

  it("traz o ambiente e os recursos do estado, sem 'verificado' (nada aqui vem da moderação)", () => {
    const dados = lerDadosParaAvaliar(formulario({}), {
      ambiente: { ...formularioVazio(), entrevista: ["legendas"], sensorial: { ruido: "silencioso" }, fisico: { rampa: { situacao: "sim", detalhe: "Entrada" } } },
      recursos: ["interprete_libras"],
    });

    expect(dados.entrevistaAdaptacoes).toEqual(["legendas"]);
    expect(dados.ambienteSensorial).toEqual({ ruido: "silencioso" });
    expect(dados.acessibilidadeFisica?.rampa).toEqual({ situacao: "sim", origem: "declarado", detalhe: "Entrada" });
    expect(dados.recursosAcessibilidade).toEqual(["interprete_libras"]);
  });

  it("sem formulário (ainda não montado), devolve dados vazios em vez de quebrar", () => {
    const dados = lerDadosParaAvaliar(null, { ambiente: formularioVazio(), recursos: [] });

    expect(dados.titulo).toBe("");
    expect(avaliarVaga(dados).pontos.length).toBeGreaterThan(5);
  });

  it("repassa a informação do vídeo para a conferência da legenda", () => {
    expect(lerDadosParaAvaliar(formulario({}), { ambiente: formularioVazio(), recursos: [], video: { legenda: false } }).video).toEqual({ legenda: false });
  });
});
