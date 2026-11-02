import { describe, it, expect, vi } from "vitest";

import {
  salvarImportacao,
  type RecursoImportavel,
  type SelecaoExperiencia,
  type SelecaoFormacao,
  type SelecaoHabilidade,
  type ServicoDePerfil,
} from "./importacaoCurriculo";

/**
 * Importar o mesmo currículo duas vezes não duplica nada: o que o perfil já tem é pulado e contado.
 * O serviço é simulado (um "perfil" em memória); a lógica é a real.
 */

const exp = (extra: Partial<SelecaoExperiencia> = {}): SelecaoExperiencia => ({
  incluir: true,
  cargo: "Analista de Suporte",
  empresa: "Empresa Exemplo",
  dataInicio: "2020-03-01",
  dataFim: "",
  atual: false,
  descricao: "",
  ...extra,
});
const form = (extra: Partial<SelecaoFormacao> = {}): SelecaoFormacao => ({
  incluir: true,
  instituicao: "Universidade Exemplo",
  curso: "Análise de Sistemas",
  dataFim: "",
  emAndamento: false,
  descricao: "",
  ...extra,
});
const hab = (nome: string, incluir = true): SelecaoHabilidade => ({ incluir, nome });

/** Um perfil em memória: `listar` devolve o que já foi criado, `criar` acrescenta. */
function perfilEmMemoria(inicial: Partial<Record<RecursoImportavel, Array<Record<string, unknown>>>> = {}) {
  const dados: Record<RecursoImportavel, Array<Record<string, unknown>>> = {
    experiencias: [...(inicial.experiencias ?? [])],
    formacoes: [...(inicial.formacoes ?? [])],
    habilidades: [...(inicial.habilidades ?? [])],
  };
  const criar = vi.fn(async (recurso: RecursoImportavel, d: Record<string, unknown>) => {
    dados[recurso].push(d);
  });
  const servico: ServicoDePerfil = { listar: async (recurso) => dados[recurso], criar };

  return { servico, criar, dados };
}

const selecaoCompleta = () => ({
  experiencias: [exp()],
  formacoes: [form()],
  habilidades: [hab("Atendimento"), hab("Excel")],
});

describe("salvarImportacao", () => {
  it("num perfil vazio, salva tudo o que foi marcado e completo", async () => {
    const { servico, criar } = perfilEmMemoria();

    const r = await salvarImportacao(selecaoCompleta(), servico);

    expect(r).toEqual({ salvos: 4, ignorados: 0, repetidos: 0 });
    expect(criar).toHaveBeenCalledTimes(4);
  });

  it("importar o mesmo currículo de novo não duplica experiência, formação nem habilidade", async () => {
    const { servico, criar, dados } = perfilEmMemoria();

    await salvarImportacao(selecaoCompleta(), servico);
    const segunda = await salvarImportacao(selecaoCompleta(), servico);

    expect(segunda).toEqual({ salvos: 0, ignorados: 0, repetidos: 4 });
    expect(criar).toHaveBeenCalledTimes(4);
    expect(dados.experiencias).toHaveLength(1);
    expect(dados.formacoes).toHaveLength(1);
    expect(dados.habilidades).toHaveLength(2);
  });

  it("reconhece o repetido mesmo com outra caixa, acento ou espaçamento", async () => {
    const { servico } = perfilEmMemoria({
      experiencias: [{ cargo: "analista de suporte", empresa: "EMPRESA  EXEMPLO", dataInicio: "2020-03-01T00:00:00.000Z" }],
      formacoes: [{ instituicao: "universidade exemplo", curso: "analise de sistemas" }],
      habilidades: [{ nome: "ATENDIMENTO" }],
    });

    const r = await salvarImportacao(selecaoCompleta(), servico);

    expect(r).toEqual({ salvos: 1, ignorados: 0, repetidos: 3 });
  });

  it("a mesma experiência em outra data é outra experiência", async () => {
    const { servico } = perfilEmMemoria({
      experiencias: [{ cargo: "Analista de Suporte", empresa: "Empresa Exemplo", dataInicio: "2018-01-01" }],
    });

    const r = await salvarImportacao({ experiencias: [exp()], formacoes: [], habilidades: [] }, servico);

    expect(r).toEqual({ salvos: 1, ignorados: 0, repetidos: 0 });
  });

  it("o que se repete dentro do próprio lote entra uma vez só", async () => {
    const { servico, dados } = perfilEmMemoria();

    const r = await salvarImportacao({ experiencias: [], formacoes: [], habilidades: [hab("Excel"), hab("excel"), hab("EXCEL ")] }, servico);

    expect(r).toEqual({ salvos: 1, ignorados: 0, repetidos: 2 });
    expect(dados.habilidades).toHaveLength(1);
  });

  it("ignora o que está marcado mas incompleto, sem inventar os campos que faltam", async () => {
    const { servico, criar } = perfilEmMemoria();

    const r = await salvarImportacao(
      {
        experiencias: [exp({ cargo: "" }), exp({ dataInicio: "" })],
        formacoes: [form({ curso: "  " })],
        habilidades: [hab("   ")],
      },
      servico,
    );

    expect(r).toEqual({ salvos: 0, ignorados: 3, repetidos: 0 });
    expect(criar).not.toHaveBeenCalled();
  });

  it("não grava o que a pessoa desmarcou", async () => {
    const { servico, criar } = perfilEmMemoria();

    const r = await salvarImportacao(
      { experiencias: [exp({ incluir: false })], formacoes: [form({ incluir: false })], habilidades: [hab("Excel", false)] },
      servico,
    );

    expect(r).toEqual({ salvos: 0, ignorados: 0, repetidos: 0 });
    expect(criar).not.toHaveBeenCalled();
  });

  it("se o servidor acusar habilidade repetida (409), conta como repetida e segue com o resto do lote", async () => {
    const { servico } = perfilEmMemoria();
    const original = servico.criar;
    servico.criar = vi.fn(async (recurso, dados) => {
      if (recurso === "habilidades" && dados.nome === "Excel") throw { response: { status: 409 } };
      return original(recurso, dados);
    });

    const r = await salvarImportacao({ experiencias: [], formacoes: [], habilidades: [hab("Excel"), hab("Atendimento")] }, servico);

    expect(r).toEqual({ salvos: 1, ignorados: 0, repetidos: 1 });
  });

  it("outros erros do servidor não são escondidos", async () => {
    const { servico } = perfilEmMemoria();
    servico.criar = vi.fn(async () => {
      throw { response: { status: 500 } };
    });

    await expect(salvarImportacao({ experiencias: [exp()], formacoes: [], habilidades: [] }, servico)).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("experiência atual não grava data de fim, e formação em andamento também não", async () => {
    const { servico, dados } = perfilEmMemoria();

    await salvarImportacao(
      { experiencias: [exp({ atual: true, dataFim: "2024-01-01" })], formacoes: [form({ emAndamento: true, dataFim: "2024-01-01" })], habilidades: [] },
      servico,
    );

    expect(dados.experiencias[0]).toMatchObject({ atual: true, dataFim: null });
    expect(dados.formacoes[0]).toMatchObject({ emAndamento: true, dataFim: null });
  });
});
