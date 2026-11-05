/**
 * Conversões do formulário do ambiente da vaga (entrevista, prévia sensorial e mapa físico) para o que
 * a API recebe, e de volta. Tudo opcional: campo em branco NÃO vira valor, vira "não informado" (some
 * do objeto). A `origem` do mapa físico nunca sai daqui: quem decide é o servidor.
 */

import type { AcessibilidadeFisica, AmbienteSensorial } from "@/types/ambiente";
import type { Vaga } from "@/types";

export type FormularioDoAmbiente = {
  entrevista: string[];
  entrevistaObservacao: string;
  sensorial: Record<string, string>;
  rotina: string;
  fisico: Record<string, { situacao: string; detalhe: string }>;
};

export const formularioVazio = (): FormularioDoAmbiente => ({ entrevista: [], entrevistaObservacao: "", sensorial: {}, rotina: "", fisico: {} });

/** O formulário inicial de uma vaga que já existe (edição). */
export function formularioDaVaga(vaga: Pick<Vaga, "entrevistaAdaptacoes" | "entrevistaObservacao" | "ambienteSensorial" | "acessibilidadeFisica">): FormularioDoAmbiente {
  const { rotina, ...caracteristicas } = vaga.ambienteSensorial ?? {};

  return {
    entrevista: [...(vaga.entrevistaAdaptacoes ?? [])],
    entrevistaObservacao: vaga.entrevistaObservacao ?? "",
    sensorial: Object.fromEntries(Object.entries(caracteristicas).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "")),
    rotina: rotina ?? "",
    fisico: Object.fromEntries(Object.entries(vaga.acessibilidadeFisica ?? {}).flatMap(([chave, item]) => (item ? [[chave, { situacao: item.situacao, detalhe: item.detalhe ?? "" }]] : []))),
  };
}

/** O que vai para a API. Chave sem valor some (não informado); nenhuma `origem` é enviada. */
export function payloadDoAmbiente(f: FormularioDoAmbiente): {
  entrevistaAdaptacoes: string[];
  entrevistaObservacao: string | null;
  ambienteSensorial: AmbienteSensorial;
  acessibilidadeFisica: Record<string, { situacao: string; detalhe?: string }>;
} {
  const sensorial: AmbienteSensorial = Object.fromEntries(Object.entries(f.sensorial).filter(([, v]) => v));
  const rotina = f.rotina.trim();

  return {
    entrevistaAdaptacoes: f.entrevista,
    entrevistaObservacao: f.entrevistaObservacao.trim() || null,
    ambienteSensorial: rotina ? { ...sensorial, rotina } : sensorial,
    acessibilidadeFisica: Object.fromEntries(
      Object.entries(f.fisico)
        .filter(([, item]) => item.situacao)
        .map(([chave, item]) => [chave, { situacao: item.situacao, ...(item.detalhe.trim() ? { detalhe: item.detalhe.trim() } : {}) }]),
    ),
  };
}

/** O mapa atual da vaga, para o formulário mostrar quais itens já estão verificados. */
export const origensDoMapa = (mapa: AcessibilidadeFisica | null | undefined): Record<string, "declarado" | "verificado"> =>
  Object.fromEntries(Object.entries(mapa ?? {}).flatMap(([chave, item]) => (item ? [[chave, item.origem]] : [])));
