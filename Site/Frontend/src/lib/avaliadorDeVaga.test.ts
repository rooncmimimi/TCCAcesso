import { describe, expect, it } from "vitest";

import { AVISO_DO_AVALIADOR, avaliarVaga, contarMelhorias, encontrarExpressoesRestritivas, palavrasPorFrase, type DadosParaAvaliar } from "./avaliadorDeVaga";

const completa: DadosParaAvaliar = {
  titulo: "Assistente administrativo",
  descricao: "Você vai atender clientes por telefone e e-mail. Registra os pedidos no sistema. Organiza os documentos do setor e trabalha com uma equipe de cinco pessoas.",
  atividades: "- Atender clientes\n- Registrar pedidos",
  requisitos: "Ensino médio completo; escrever e-mails claros",
  requisitosDesejaveis: "Inglês básico",
  etapasSelecao: "1. Conversa por mensagem\n2. Entrevista curta",
  cargaHoraria: "30 horas semanais",
  salario: 2500,
  modalidade: "presencial",
  cidade: "Campinas",
  recursosAcessibilidade: ["interprete_libras"],
  entrevistaAdaptacoes: ["entrevista_por_texto"],
  ambienteSensorial: { ruido: "silencioso", comunicacao: "escrita" },
  acessibilidadeFisica: { rampa: { situacao: "sim", origem: "declarado" } },
};

const ponto = (r: ReturnType<typeof avaliarVaga>, id: string) => r.pontos.find((p) => p.id === id)!;

describe("avaliarVaga", () => {
  it("uma vaga completa não tem o que melhorar", () => {
    const r = avaliarVaga(completa);

    expect(contarMelhorias(r)).toBe(0);
    expect(r.expressoes).toEqual([]);
  });

  it("sempre diz que não é certificação legal e que não impede a publicação", () => {
    const r = avaliarVaga({});

    expect(r.aviso).toBe(AVISO_DO_AVALIADOR);
    expect(r.aviso).toMatch(/não é certificação nem parecer jurídico/i);
    expect(r.aviso).toMatch(/não impede a publicação/i);
  });

  it("uma vaga vazia aponta melhorias e nenhuma delas fala em 'reprovada' ou 'inválida'", () => {
    const r = avaliarVaga({});

    expect(contarMelhorias(r)).toBeGreaterThanOrEqual(8);
    expect(JSON.stringify(r.pontos)).not.toMatch(/reprovad|inv[aá]lid|ilegal|bloquead|n[aã]o pode ser publicad/i);
  });

  it("descrição curta e frase longa são pontos de clareza diferentes", () => {
    expect(ponto(avaliarVaga({ descricao: "Atender clientes." }), "clareza").titulo).toMatch(/curta/);

    const longa = `${Array(40).fill("palavra").join(" ")}. ${Array(40).fill("outra").join(" ")}.`;
    expect(ponto(avaliarVaga({ descricao: longa }), "clareza").titulo).toMatch(/longas/);
  });

  it("obrigatórios sem desejáveis: pede para separar. Lista enorme de obrigatórios: pede para conferir", () => {
    expect(ponto(avaliarVaga({ requisitos: "Ensino médio" }), "requisitos").titulo).toMatch(/não estão separados/);

    const muitos = Array.from({ length: 10 }, (_, i) => `Requisito ${i + 1}`).join("\n");
    expect(ponto(avaliarVaga({ requisitos: muitos, requisitosDesejaveis: "Inglês" }), "requisitos").titulo).toMatch(/10 requisitos obrigatórios/);
  });

  it("salário 0 ou vazio conta como não informado", () => {
    expect(ponto(avaliarVaga({ salario: 0 }), "salario").situacao).toBe("melhorar");
    expect(ponto(avaliarVaga({ salario: "" }), "salario").situacao).toBe("melhorar");
    expect(ponto(avaliarVaga({ salario: "3000" }), "salario").situacao).toBe("ok");
  });

  it("a acessibilidade física só é cobrada em vaga presencial ou híbrida", () => {
    expect(avaliarVaga({ modalidade: "remoto" }).pontos.some((p) => p.id === "fisica")).toBe(false);
    expect(ponto(avaliarVaga({ modalidade: "presencial" }), "fisica").situacao).toBe("melhorar");
    expect(ponto(avaliarVaga({ modalidade: "hibrido", recursosAcessibilidade: ["elevador_rampa"] }), "fisica").situacao).toBe("ok");
  });

  it("presencial sem cidade pede a cidade", () => {
    expect(ponto(avaliarVaga({ modalidade: "presencial" }), "modalidade").titulo).toMatch(/cidade/i);
  });

  it("legenda do vídeo só entra na conta quando há vídeo", () => {
    expect(avaliarVaga(completa).pontos.some((p) => p.id === "legendas")).toBe(false);
    expect(ponto(avaliarVaga({ ...completa, video: { legenda: false } }), "legendas").situacao).toBe("melhorar");
    expect(ponto(avaliarVaga({ ...completa, video: { legenda: true } }), "legendas").situacao).toBe("ok");
  });

  it("informar a comunicação da entrevista ou do trabalho conta como ok", () => {
    expect(ponto(avaliarVaga({ entrevistaAdaptacoes: ["legendas"] }), "comunicacao").situacao).toBe("ok");
    expect(ponto(avaliarVaga({ ambienteSensorial: { comunicacao: "mista" } }), "comunicacao").situacao).toBe("ok");
    expect(ponto(avaliarVaga({}), "comunicacao").situacao).toBe("melhorar");
  });
});

describe("expressões que costumam excluir", () => {
  const achar = (campos: DadosParaAvaliar) => encontrarExpressoesRestritivas(campos).map((e) => e.id.split(":")[0]);

  it.each([
    ["boa aparência", { descricao: "Procuramos pessoa com boa aparência para a recepção." }, "aparencia"],
    ["limite de idade", { requisitos: "Ter até 35 anos" }, "idade-faixa"],
    ["perfil jovem", { descricao: "Buscamos um perfil jovem e animado." }, "jovem"],
    ["sem deficiência", { requisitos: "Pessoa saudável e sem deficiência" }, "sem-deficiencia"],
    ["capacidade física", { requisitos: "Necessário ouvir perfeitamente" }, "capacidade-fisica"],
    ["comunicação oral", { requisitos: "Excelente comunicação oral" }, "comunicacao-oral"],
    ["gênero", { descricao: "Apenas mulheres." }, "genero"],
    ["estado civil", { requisitos: "Preferencialmente solteira" }, "estado-civil"],
    ["disponibilidade total", { descricao: "Exigimos disponibilidade total." }, "disponibilidade-total"],
    ["perfil dinâmico", { descricao: "Perfil dinâmico e ágil." }, "dinamico"],
    ["CNH obrigatória", { requisitos: "CNH obrigatória categoria B" }, "carteira"],
    ["muitos anos de experiência", { requisitos: "Mínimo de 8 anos de experiência" }, "experiencia-excessiva"],
  ])("aponta %s", (_nome, campos, id) => {
    expect(achar(campos)).toContain(id);
  });

  it("'jovem aprendiz' é um tipo de contrato, não uma restrição", () => {
    expect(achar({ descricao: "Vaga para Jovem Aprendiz no setor administrativo." })).not.toContain("jovem");
  });

  it("cada ocorrência diz o trecho, o campo e por que costuma excluir", () => {
    const [e] = encontrarExpressoesRestritivas({ requisitos: "Ter até 35 anos" });

    expect(e.trecho).toBe("até 35 anos");
    expect(e.campo).toBe("Requisitos");
    expect(e.explicacao.length).toBeGreaterThan(30);
  });

  it("um texto neutro não gera apontamento", () => {
    expect(encontrarExpressoesRestritivas(completa)).toEqual([]);
  });

  it("procura também no título e nas atividades", () => {
    expect(achar({ titulo: "Recepcionista com boa aparência" })).toContain("aparencia");
    expect(achar({ atividades: "Ficar em pé por longos períodos" })).toContain("capacidade-fisica");
  });
});

describe("palavrasPorFrase", () => {
  it("calcula a média e aceita texto vazio", () => {
    expect(palavrasPorFrase("")).toBe(0);
    expect(palavrasPorFrase("Uma duas três. Quatro cinco.")).toBe(2.5);
  });
});
