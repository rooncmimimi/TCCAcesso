/**
 * Comparador de vagas lado a lado: modalidade, jornada, localização, ruído, iluminação, espaço,
 * interrupções, pausas, comunicação, acessibilidade física e adaptações disponíveis.
 *
 * NÃO classifica nenhuma vaga como adequada ou inadequada, não dá nota e não escolhe por ninguém: só
 * coloca os dados lado a lado e marca onde as vagas diferem, para a pessoa decidir com as próprias
 * necessidades. O que a empresa não informou aparece como "Não informado", nunca como suposição.
 *
 * Funções puras, para testar sem tela.
 */

import type { ItemFisico } from "@/types/ambiente";
import type { CatalogoDoAmbiente } from "@/types/ambiente";
import type { Vaga } from "@/types";
import { tx } from "@/i18n/frases";

export const NAO_INFORMADO = "Não informado";

export const LIMITE_DE_VAGAS = 3;

export type LinhaDaComparacao = {
  id: string;
  grupo: string;
  rotulo: string;
  valores: string[];
  /** As vagas têm valores diferentes nesta linha? É só um aviso visual, nunca um julgamento. */
  diferem: boolean;
};

const MODALIDADE: Record<string, string> = { get presencial() { return tx("Presencial"); }, get hibrido() { return tx("Híbrido"); }, get remoto() { return tx("Remoto"); } };
const SITUACAO: Record<string, string> = { get sim() { return tx("Sim"); }, get parcial() { return tx("Parcial"); }, get nao() { return tx("Não"); } };

const limpar = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

function rotuloDaOpcao(catalogo: CatalogoDoAmbiente | undefined, chave: string, valor: string | undefined): string {
  if (!valor) return tx(NAO_INFORMADO);

  return catalogo?.ambienteSensorial.find((c) => c.chave === chave)?.opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
}

function textoDoItemFisico(item: ItemFisico | undefined): string {
  if (!item) return tx(NAO_INFORMADO);

  const origem = item.origem === "verificado" ? tx("verificado pelo ACESSO") : tx("declarado pela empresa");

  return `${SITUACAO[item.situacao] ?? item.situacao} (${origem})${item.detalhe ? `: ${item.detalhe}` : ""}`;
}

function lista(itens: string[]): string {
  return itens.length > 0 ? itens.join(", ") : tx(NAO_INFORMADO);
}

export function compararVagas(vagas: Vaga[], catalogo: CatalogoDoAmbiente | undefined, rotuloDoRecurso: (chave: string) => string = (c) => c): LinhaDaComparacao[] {
  const linha = (id: string, grupo: string, rotulo: string, valorDe: (v: Vaga) => string): LinhaDaComparacao => {
    const valores = vagas.map(valorDe);

    return { id, grupo, rotulo, valores, diferem: new Set(valores).size > 1 };
  };

  const linhas: LinhaDaComparacao[] = [
    linha("modalidade", tx("Trabalho"), tx("Modalidade"), (v) => (v.modalidade ? (MODALIDADE[v.modalidade] ?? v.modalidade) : tx(NAO_INFORMADO))),
    linha("jornada", tx("Trabalho"), tx("Jornada"), (v) => limpar(v.cargaHoraria) || tx(NAO_INFORMADO)),
    linha("local", tx("Trabalho"), tx("Localização"), (v) => [limpar(v.cidade), limpar(v.estado)].filter(Boolean).join(" - ") || tx(NAO_INFORMADO)),
    ...(catalogo?.ambienteSensorial ?? []).map((c) => linha(`sensorial-${c.chave}`, tx("Ambiente sensorial"), c.rotulo, (v) => rotuloDaOpcao(catalogo, c.chave, v.ambienteSensorial?.[c.chave]))),
    linha("rotina", tx("Ambiente sensorial"), tx("Rotina"), (v) => limpar(v.ambienteSensorial?.rotina) || tx(NAO_INFORMADO)),
    ...(catalogo?.itensFisicos ?? []).map((i) => linha(`fisica-${i.chave}`, tx("Acessibilidade física"), i.rotulo, (v) => textoDoItemFisico(v.acessibilidadeFisica?.[i.chave]))),
    linha("entrevista", tx("Comunicação e adaptações"), tx("A entrevista oferece"), (v) =>
      lista((v.entrevistaAdaptacoes ?? []).map((chave) => catalogo?.entrevista.find((o) => o.chave === chave)?.rotulo ?? chave)),
    ),
    linha("recursos", tx("Comunicação e adaptações"), tx("Recursos de acessibilidade"), (v) => lista((v.recursosAcessibilidade ?? []).map(rotuloDoRecurso))),
  ];

  return linhas;
}

/** Quantas linhas diferem entre as vagas (para o resumo "N diferenças"). */
export const contarDiferencas = (linhas: LinhaDaComparacao[]) => linhas.filter((l) => l.diferem).length;
