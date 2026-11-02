import { normalizarParaBusca } from "@/utils/texto";

/**
 * Confirmação da importação de dados do currículo: grava no perfil só o que a pessoa revisou e marcou,
 * **sem repetir o que o perfil já tem**.
 *
 * Antes, confirmar a mesma importação duas vezes duplicava experiências e formações, e na segunda vez a
 * habilidade repetida estourava a restrição única do banco no meio do lote, deixando metade salva. Aqui
 * o perfil é consultado antes, o que já existe (ou aparece duas vezes no próprio lote) é pulado e contado,
 * e uma habilidade que o servidor recusar por repetida (conflito) também só entra na conta dos repetidos.
 *
 * Nada é inventado nem sobrescrito: itens existentes nunca são alterados.
 */

export type RecursoImportavel = "experiencias" | "formacoes" | "habilidades";

export interface SelecaoExperiencia {
  incluir: boolean;
  cargo: string;
  empresa: string;
  dataInicio: string;
  dataFim: string;
  atual: boolean;
  descricao: string;
}

export interface SelecaoFormacao {
  incluir: boolean;
  instituicao: string;
  curso: string;
  dataFim: string;
  emAndamento: boolean;
  descricao: string;
}

export interface SelecaoHabilidade {
  incluir: boolean;
  nome: string;
}

export interface ServicoDePerfil {
  listar(recurso: RecursoImportavel): Promise<Array<Record<string, unknown>>>;
  criar(recurso: RecursoImportavel, dados: Record<string, unknown>): Promise<unknown>;
}

export interface ResultadoDaImportacao {
  salvos: number;
  /** Marcados, mas sem os campos obrigatórios preenchidos. */
  ignorados: number;
  /** Já estavam no perfil (ou repetidos no próprio lote), e por isso não foram criados de novo. */
  repetidos: number;
}

const norm = (valor: unknown): string => normalizarParaBusca(String(valor ?? "")).replace(/\s+/g, " ").trim();
const dia = (valor: unknown): string => String(valor ?? "").slice(0, 10);

export const chaveExperiencia = (e: { cargo?: unknown; empresa?: unknown; dataInicio?: unknown }): string =>
  `${norm(e.cargo)}|${norm(e.empresa)}|${dia(e.dataInicio)}`;

export const chaveFormacao = (f: { instituicao?: unknown; curso?: unknown }): string =>
  `${norm(f.instituicao)}|${norm(f.curso)}`;

export const chaveHabilidade = (h: { nome?: unknown }): string => norm(h.nome);

/** Erro de "já existe" do servidor (409): a repetição foi detectada por ele, não por nós. */
function ehConflito(erro: unknown): boolean {
  return (erro as { response?: { status?: number } })?.response?.status === 409;
}

export async function salvarImportacao(
  selecao: { experiencias: SelecaoExperiencia[]; formacoes: SelecaoFormacao[]; habilidades: SelecaoHabilidade[] },
  servico: ServicoDePerfil,
): Promise<ResultadoDaImportacao> {
  const resultado: ResultadoDaImportacao = { salvos: 0, ignorados: 0, repetidos: 0 };

  const [existentesExp, existentesForm, existentesHab] = await Promise.all([
    servico.listar("experiencias"),
    servico.listar("formacoes"),
    servico.listar("habilidades"),
  ]);

  const jaTem = {
    experiencias: new Set(existentesExp.map(chaveExperiencia)),
    formacoes: new Set(existentesForm.map(chaveFormacao)),
    habilidades: new Set(existentesHab.map(chaveHabilidade)),
  };

  /** Cria o item se for novo; devolve false quando ele já existia. */
  async function criarSeNovo(
    recurso: RecursoImportavel,
    chave: string,
    dados: Record<string, unknown>,
  ): Promise<void> {
    if (jaTem[recurso].has(chave)) {
      resultado.repetidos += 1;
      return;
    }

    try {
      await servico.criar(recurso, dados);
    } catch (erro) {
      if (recurso === "habilidades" && ehConflito(erro)) {
        resultado.repetidos += 1;
        jaTem[recurso].add(chave);
        return;
      }

      throw erro;
    }

    jaTem[recurso].add(chave);
    resultado.salvos += 1;
  }

  for (const item of selecao.experiencias) {
    if (!item.incluir) continue;

    if (!item.cargo.trim() || !item.empresa.trim() || !item.dataInicio) {
      resultado.ignorados += 1;
      continue;
    }

    await criarSeNovo("experiencias", chaveExperiencia(item), {
      cargo: item.cargo.trim(),
      empresa: item.empresa.trim(),
      dataInicio: item.dataInicio,
      dataFim: item.atual ? null : item.dataFim || null,
      atual: item.atual,
      descricao: item.descricao.trim() || null,
    });
  }

  for (const item of selecao.formacoes) {
    if (!item.incluir) continue;

    if (!item.instituicao.trim() || !item.curso.trim()) {
      resultado.ignorados += 1;
      continue;
    }

    await criarSeNovo("formacoes", chaveFormacao(item), {
      instituicao: item.instituicao.trim(),
      curso: item.curso.trim(),
      dataFim: item.emAndamento ? null : item.dataFim || null,
      emAndamento: item.emAndamento,
      descricao: item.descricao.trim() || null,
    });
  }

  for (const item of selecao.habilidades) {
    if (!item.incluir || !item.nome.trim()) continue;

    await criarSeNovo("habilidades", chaveHabilidade(item), { nome: item.nome.trim() });
  }

  return resultado;
}
