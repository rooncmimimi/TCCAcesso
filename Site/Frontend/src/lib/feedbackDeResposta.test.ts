import { describe, expect, it } from "vitest";

import { explicarClassificacao, retornoDaResposta } from "./feedbackDeResposta";
import { imagensSemDescricao } from "@/components/feed/imagensSemDescricao";
import { completarEscolha, contarCopia, escolhaDaCopia, escolhaTemConteudo, escolhaVazia } from "@/types/adaptacoes";

const imagem = (nome = "a.png") => new File(["x"], nome, { type: "image/png" });
const video = () => new File(["x"], "v.mp4", { type: "video/mp4" });

describe("retornoDaResposta: sugestão, nunca nota", () => {
  it("resposta vazia pede uma resposta, sem julgar", () => {
    const r = retornoDaResposta("   ");

    expect(r.pontosFortes).toEqual([]);
    expect(r.sugestoes[0]).toMatch(/mesmo curta/i);
  });

  it("uma resposta com exemplo, motivo e primeira pessoa só tem pontos fortes", () => {
    const r = retornoDaResposta("Sou atendente e trabalhei dois anos num balcão porque gosto de ajudar as pessoas a resolver o que precisam.");

    expect(r.pontosFortes.length).toBeGreaterThanOrEqual(3);
    expect(r.sugestoes).toEqual([]);
  });

  it("resposta curta ganha ideias, e continua sendo válida", () => {
    const r = retornoDaResposta("Sou Ana.");

    expect(r.sugestoes.join(" ")).toMatch(/uma resposta curta também vale/i);
  });

  it("resposta longa demais sugere separar em ideias", () => {
    const r = retornoDaResposta(Array(150).fill("palavra").join(" "));

    expect(r.sugestoes.join(" ")).toMatch(/longa/i);
  });

  it("nenhum retorno fala em nota, ponto, aprovação ou eliminação", () => {
    for (const texto of ["", "Sou Ana.", "Eu trabalhei dois anos porque gosto.", Array(150).fill("x").join(" ")]) {
      const r = retornoDaResposta(texto);

      expect([...r.pontosFortes, ...r.sugestoes].join(" ")).not.toMatch(/\bnota\b|\bnotas\b|pontua|pontuação|aprovad|reprovad|eliminat|inadequad/i);
    }
  });
});

describe("explicarClassificacao", () => {
  it("explica em vez de pontuar", () => {
    expect(explicarClassificacao("desejavel", undefined)).toMatch(/ainda não classificou/i);
    expect(explicarClassificacao("desejavel", "desejavel")).toMatch(/isso mesmo/i);
    expect(explicarClassificacao("desejavel", "obrigatorio")).toMatch(/outro lado/i);
  });
});

describe("imagensSemDescricao", () => {
  it("só conta imagens informativas sem descrição", () => {
    const anexos = [imagem("1.png"), imagem("2.png"), imagem("3.png"), video()];

    expect(imagensSemDescricao(anexos, ["", "tem descrição", "   ", ""], [false, false, false, false])).toEqual([0, 2]);
  });

  it("imagem decorativa não gera aviso, e vídeo nunca entra", () => {
    expect(imagensSemDescricao([imagem(), video()], ["", ""], [true, false])).toEqual([]);
  });

  it("sem anexos, sem aviso", () => {
    expect(imagensSemDescricao([], [], [])).toEqual([]);
  });
});

describe("escolhas de compartilhamento", () => {
  it("vazia não tem conteúdo; qualquer marca ou texto passa a ter", () => {
    expect(escolhaTemConteudo(escolhaVazia())).toBe(false);
    expect(escolhaTemConteudo({ ...escolhaVazia(), deficiencia: true })).toBe(true);
    expect(escolhaTemConteudo({ ...escolhaVazia(), adaptacoes: ["legendas"] })).toBe(true);
    expect(escolhaTemConteudo({ ...escolhaVazia(), outra: "  " })).toBe(false);
    expect(escolhaTemConteudo({ ...escolhaVazia(), outra: "Preciso de rampa" })).toBe(true);
  });

  it("completarEscolha preenche o que faltar com tudo desligado", () => {
    const e = completarEscolha({ adaptacoes: ["legendas"], comunicacao: { canaisPreferidos: true } as never });

    expect(e.adaptacoes).toEqual(["legendas"]);
    expect(e.comunicacao).toEqual({ canaisPreferidos: true, canaisAEvitar: false, melhorHorario: false });
    expect(e.deficiencia).toBe(false);
    expect(completarEscolha(null)).toEqual(escolhaVazia());
  });

  it("escolhaDaCopia reconstrói a escolha que originou uma cópia", () => {
    const itens = {
      adaptacoes: [{ chave: "legendas", rotulo: "L" }],
      comunicacao: { melhorHorario: "À tarde" },
      deficiencias: [{ id: "d1", nome: "x" }],
      observacoes: { adaptacao: "obs" },
      outra: "texto",
    };

    expect(escolhaDaCopia(itens)).toEqual({
      adaptacoes: ["legendas"],
      comunicacao: { canaisPreferidos: false, canaisAEvitar: false, melhorHorario: true },
      deficiencia: true,
      observacaoDeAdaptacao: true,
      observacaoDeComunicacao: false,
      outra: "texto",
    });
    expect(contarCopia(itens)).toBe(5);
    expect(contarCopia(null)).toBe(0);
  });
});
