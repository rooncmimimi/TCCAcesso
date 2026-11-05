import { describe, expect, it } from "vitest";

import type { CatalogoDoAmbiente } from "@/types/ambiente";
import type { Vaga } from "@/types";
import { compararVagas, contarDiferencas, NAO_INFORMADO } from "./comparadorDeVagas";

const catalogo: CatalogoDoAmbiente = {
  ambienteSensorial: [
    { chave: "ruido", rotulo: "Nível de ruído", opcoes: [{ valor: "silencioso", rotulo: "Silencioso" }, { valor: "alto", rotulo: "Alto" }] },
    { chave: "iluminacao", rotulo: "Iluminação", opcoes: [{ valor: "natural", rotulo: "Luz natural" }] },
  ],
  itensFisicos: [{ chave: "rampa", rotulo: "Rampas" }, { chave: "elevador", rotulo: "Elevadores" }],
  situacoesFisicas: [],
  origensFisicas: [],
  entrevista: [{ chave: "entrevista_por_texto", rotulo: "Entrevista por texto" }, { chave: "legendas", rotulo: "Legendas em vídeos e chamadas" }],
};

const base: Vaga = { id: "a", titulo: "A", descricao: "x", modalidade: "presencial", status: "aberta" };

const vagaA: Vaga = {
  ...base,
  id: "a",
  cargaHoraria: "30 horas semanais",
  cidade: "Campinas",
  estado: "SP",
  ambienteSensorial: { ruido: "silencioso", rotina: "Das 9h às 15h" },
  acessibilidadeFisica: { rampa: { situacao: "sim", origem: "verificado" }, elevador: { situacao: "nao", origem: "declarado", detalhe: "Prédio de dois andares" } },
  entrevistaAdaptacoes: ["entrevista_por_texto"],
  recursosAcessibilidade: ["interprete_libras"],
};

const vagaB: Vaga = { ...base, id: "b", modalidade: "remoto" };

const linhaDe = (linhas: ReturnType<typeof compararVagas>, id: string) => linhas.find((l) => l.id === id)!;

describe("compararVagas", () => {
  it("coloca os valores das vagas lado a lado, na ordem recebida", () => {
    const linhas = compararVagas([vagaA, vagaB], catalogo);

    expect(linhaDe(linhas, "modalidade").valores).toEqual(["Presencial", "Remoto"]);
    expect(linhaDe(linhas, "jornada").valores).toEqual(["30 horas semanais", NAO_INFORMADO]);
    expect(linhaDe(linhas, "local").valores).toEqual(["Campinas - SP", NAO_INFORMADO]);
  });

  it("o que a empresa não informou aparece como 'Não informado', nunca como suposição", () => {
    const linhas = compararVagas([vagaB], catalogo);

    for (const id of ["sensorial-ruido", "sensorial-iluminacao", "rotina", "fisica-rampa", "fisica-elevador", "entrevista", "recursos"]) {
      expect(linhaDe(linhas, id).valores).toEqual([NAO_INFORMADO]);
    }
  });

  it("a acessibilidade física diz a situação, de quem é a informação e o detalhe", () => {
    const linhas = compararVagas([vagaA], catalogo);

    expect(linhaDe(linhas, "fisica-rampa").valores[0]).toBe("Sim (verificado pelo ACESSO)");
    expect(linhaDe(linhas, "fisica-elevador").valores[0]).toBe("Não (declarado pela empresa): Prédio de dois andares");
  });

  it("traduz opções, adaptações de entrevista e recursos com os rótulos recebidos", () => {
    const linhas = compararVagas([vagaA], catalogo, (c) => (c === "interprete_libras" ? "Intérprete de Libras" : c));

    expect(linhaDe(linhas, "sensorial-ruido").valores[0]).toBe("Silencioso");
    expect(linhaDe(linhas, "entrevista").valores[0]).toBe("Entrevista por texto");
    expect(linhaDe(linhas, "recursos").valores[0]).toBe("Intérprete de Libras");
  });

  it("marca onde as vagas diferem, e só isso: nenhuma linha traz nota, ranking ou veredito", () => {
    const linhas = compararVagas([vagaA, vagaB], catalogo);

    expect(linhaDe(linhas, "modalidade").diferem).toBe(true);
    expect(linhaDe(linhas, "sensorial-iluminacao").diferem).toBe(false);
    expect(contarDiferencas(linhas)).toBeGreaterThan(0);
    expect(JSON.stringify(linhas)).not.toMatch(/melhor|pior|adequad|inadequad|recomend|nota|ranking|pontos?\b/i);
  });

  it("com uma vaga só, nada difere", () => {
    expect(contarDiferencas(compararVagas([vagaA], catalogo))).toBe(0);
  });

  it("sem o catálogo (ainda carregando), mostra o que dá sem quebrar", () => {
    const linhas = compararVagas([vagaA, vagaB], undefined);

    expect(linhaDe(linhas, "modalidade").valores).toEqual(["Presencial", "Remoto"]);
    expect(linhas.some((l) => l.id.startsWith("sensorial-"))).toBe(false);
  });
});
