import { describe, expect, it } from "vitest";

import type { Vaga } from "@/types";
import { itensDoTexto, montarResumoVaga, NAO_INFORMADO, paraVoce, resumirDescricao, type SecaoDoResumo } from "./resumoVaga";

const vagaCompleta: Vaga = {
  id: "v1",
  titulo: "Assistente Administrativo",
  descricao:
    "Profissional responsável pela execução de atividades administrativas, controle de indicadores e suporte às rotinas operacionais. Trabalha em equipe pequena. Haverá treinamento.",
  requisitos: "- Ensino médio completo\n- Conhecimento básico de Excel;\n• Boa organização",
  beneficios: "Vale-refeição; Plano de saúde; Vale-transporte",
  cidade: "São Paulo",
  estado: "SP",
  cargaHoraria: "30 horas semanais",
  modalidade: "hibrido",
  contrato: "clt",
  salario: 2500,
  publicoAlvo: "pcd",
  acessibilidade: "Temos rampa na entrada e intérprete sob agendamento",
  recursosAcessibilidade: ["interprete_libras", "elevador_rampa"],
  status: "aberta",
  empresa: { id: "e1", nomeFantasia: "Grupo Aurora" },
};

const secao = (vaga: Vaga, id: string): SecaoDoResumo => montarResumoVaga(vaga).secoes.find((s) => s.id === id)!;
const texto = (s: SecaoDoResumo) => (s.tipo === "texto" ? s.texto : s.itens.join(" | "));

describe("montarResumoVaga: vaga completa", () => {
  it("monta cada parte com os dados da empresa", () => {
    expect(texto(secao(vagaCompleta, "cargo"))).toBe("Assistente Administrativo, na empresa Grupo Aurora.");
    expect(texto(secao(vagaCompleta, "local"))).toBe(
      "Híbrido: parte dos dias no local da empresa e parte em casa. Cidade: São Paulo - SP.",
    );
    expect(texto(secao(vagaCompleta, "jornada"))).toBe("30 horas semanais.");
    expect(texto(secao(vagaCompleta, "contrato"))).toContain("CLT (carteira assinada");
    expect(texto(secao(vagaCompleta, "publico"))).toBe("Esta vaga é para pessoas com deficiência (PCD).");
  });

  it("formata o salário em reais sem inventar a periodicidade", () => {
    const s = texto(secao(vagaCompleta, "salario"));

    expect(s).toMatch(/R\$\s?2\.500,00/);
    expect(s).toContain("valor informado pela empresa");
    expect(s).not.toMatch(/m[êe]s|hora|ano/i);
  });

  it("transforma requisitos e benefícios em listas, sem os marcadores", () => {
    expect(secao(vagaCompleta, "requisitos")).toMatchObject({
      tipo: "lista",
      itens: ["Ensino médio completo", "Conhecimento básico de Excel", "Boa organização"],
    });
    expect(secao(vagaCompleta, "beneficios")).toMatchObject({
      tipo: "lista",
      itens: ["Vale-refeição", "Plano de saúde", "Vale-transporte"],
    });
  });

  it("diz que a empresa não separou requisitos obrigatórios de desejáveis", () => {
    const s = secao(vagaCompleta, "requisitos");

    expect(s.tipo === "lista" && s.observacao).toBe("A empresa não separou o que é obrigatório do que é desejável.");
  });

  it("lista os recursos de acessibilidade e repete os detalhes da empresa", () => {
    const s = secao(vagaCompleta, "acessibilidade");

    expect(s).toMatchObject({ tipo: "lista", itens: ["Intérprete de Libras", "Elevador ou rampa"] });
    expect(s.tipo === "lista" && s.observacao).toBe("Detalhes da empresa: Temos rampa na entrada e intérprete sob agendamento.");
  });

  it("as etapas da seleção sempre aparecem como não informadas: a vaga não tem esse campo", () => {
    expect(secao(vagaCompleta, "etapas")).toMatchObject({ informado: false, texto: NAO_INFORMADO });
  });

  it("o texto falado leva todas as seções, em ordem", () => {
    const { textoFalado } = montarResumoVaga(vagaCompleta);

    expect(textoFalado.startsWith("Cargo: Assistente Administrativo")).toBe(true);
    expect(textoFalado).toContain("O que você vai fazer: Você vai ser responsável pela execução");
    expect(textoFalado).toContain("Etapas da seleção: A empresa não informou.");
    expect(textoFalado.indexOf("Cargo")).toBeLessThan(textoFalado.indexOf("Salário"));
    expect(textoFalado.indexOf("Salário")).toBeLessThan(textoFalado.indexOf("Etapas da seleção"));
  });
});

describe("montarResumoVaga: dado que a empresa não preencheu", () => {
  const minima: Vaga = { id: "v2", titulo: "Auxiliar", descricao: "Ajudar no atendimento.", modalidade: "presencial", status: "aberta" };

  it("marca como não informado, sem supor nada", () => {
    for (const id of ["salario", "jornada", "contrato", "requisitos", "beneficios", "acessibilidade", "etapas"]) {
      expect(secao(minima, id), id).toMatchObject({ informado: false, texto: NAO_INFORMADO });
    }
  });

  it("não tem a seção de público quando a vaga é geral ou não diz", () => {
    expect(montarResumoVaga(minima).secoes.some((s) => s.id === "publico")).toBe(false);
    expect(montarResumoVaga({ ...minima, publicoAlvo: "geral" }).secoes.some((s) => s.id === "publico")).toBe(false);
  });

  it("cargo sem empresa não inventa o nome da empresa", () => {
    expect(texto(secao(minima, "cargo"))).toBe("Auxiliar.");
  });

  it("local sem cidade mostra só a modalidade", () => {
    expect(texto(secao(minima, "local"))).toBe("Presencial: você trabalha no local da empresa.");
  });

  it("salário zero, vazio ou nulo conta como não informado", () => {
    for (const salario of [0, "", null, undefined]) {
      expect(secao({ ...minima, salario }, "salario").informado, String(salario)).toBe(false);
    }
  });

  it("salário que não é número (a combinar) é repetido como a empresa escreveu", () => {
    expect(texto(secao({ ...minima, salario: "A combinar" }, "salario"))).toBe("A combinar, valor informado pela empresa.");
  });

  it("salário vindo como texto decimal do banco é formatado", () => {
    expect(texto(secao({ ...minima, salario: "1500.00" }, "salario"))).toMatch(/R\$\s?1\.500,00/);
  });

  it("só detalhes de acessibilidade, sem a lista de recursos, viram texto", () => {
    const s = secao({ ...minima, acessibilidade: "Sala silenciosa disponível" }, "acessibilidade");

    expect(s).toMatchObject({ tipo: "texto", informado: true, texto: "Sala silenciosa disponível." });
  });

  it("não quebra com campos nulos e listas vazias", () => {
    const v: Vaga = { ...minima, requisitos: null, beneficios: null, recursosAcessibilidade: null, acessibilidade: null, cidade: null, estado: null };

    expect(() => montarResumoVaga(v)).not.toThrow();
  });
});

describe("resumirDescricao", () => {
  it("troca só a abertura 'Profissional responsável por…' e mantém o resto como a empresa escreveu", () => {
    expect(resumirDescricao("Profissional responsável pela execução de atividades administrativas e suporte.")).toBe(
      "Você vai ser responsável pela execução de atividades administrativas e suporte.",
    );
  });

  it("pega no máximo duas frases inteiras", () => {
    expect(resumirDescricao("Primeira frase. Segunda frase. Terceira frase.")).toBe("Primeira frase. Segunda frase.");
  });

  it("não deixa a segunda frase estourar o limite de tamanho", () => {
    const longa = `${"palavra ".repeat(60).trim()}.`;

    expect(resumirDescricao(`Curta. ${longa}`)).toBe("Curta.");
  });

  it("mantém inteira a primeira frase, mesmo longa: cortar mudaria o sentido", () => {
    const longa = `${"palavra ".repeat(80).trim()}.`;

    expect(resumirDescricao(longa)).toBe(longa);
  });

  it("não corta valores nem domínios no meio", () => {
    expect(resumirDescricao("Pagamos R$ 1.500,00 e o site é www.exemplo.com.br. Venha.")).toBe(
      "Pagamos R$ 1.500,00 e o site é www.exemplo.com.br. Venha.",
    );
  });

  it("devolve null sem descrição", () => {
    expect(resumirDescricao("   ")).toBeNull();
    expect(resumirDescricao(undefined)).toBeNull();
  });

  it("completa o ponto final quando falta", () => {
    expect(resumirDescricao("Atender clientes")).toBe("Atender clientes.");
  });
});

describe("paraVoce", () => {
  it.each([
    ["Profissional responsável por organizar arquivos", "Você vai ser responsável por organizar arquivos"],
    ["O profissional será responsável pelo caixa", "Você vai ser responsável pelo caixa"],
    ["Será responsável pela limpeza", "Você vai ser responsável pela limpeza"],
    ["Colaborador vai atender o público", "Você vai atender o público"],
    ["Atuará no setor financeiro", "Você vai atuar no setor financeiro"],
  ])("%s", (entrada, saida) => {
    expect(paraVoce(entrada)).toBe(saida);
  });

  it.each([
    "Atendente de loja com experiência",
    "Analista de dados júnior",
    "Operador de máquinas",
    "A empresa busca pessoas dedicadas",
  ])("deixa intocada a frase que não começa com os padrões conhecidos: %s", (frase) => {
    expect(paraVoce(frase)).toBe(frase);
  });
});

describe("itensDoTexto", () => {
  it("entende linhas, ponto e vírgula, hífens, bolinhas e numeração", () => {
    expect(itensDoTexto("1. Primeiro\n2) Segundo\n* Terceiro\n• Quarto; Quinto")).toEqual([
      "Primeiro",
      "Segundo",
      "Terceiro",
      "Quarto",
      "Quinto",
    ]);
  });

  it("texto corrido sem separador é um item só", () => {
    expect(itensDoTexto("Ensino médio completo e boa comunicação")).toEqual(["Ensino médio completo e boa comunicação"]);
  });

  it("não parte um item por vírgula (poderia cortar uma ideia ao meio)", () => {
    expect(itensDoTexto("Excel, Word e PowerPoint")).toEqual(["Excel, Word e PowerPoint"]);
  });

  it("vazio, nulo ou só espaços dá lista vazia", () => {
    expect(itensDoTexto("")).toEqual([]);
    expect(itensDoTexto(null)).toEqual([]);
    expect(itensDoTexto("  \n  ")).toEqual([]);
  });
});
