/** Tipos do Bloco 2: Minha Acessibilidade, prévia de privacidade, rascunho e adaptações por candidatura. */

export interface ItemDoCatalogo {
  chave: string;
  rotulo: string;
}

export interface AdaptacaoDoCatalogo extends ItemDoCatalogo {
  grupo: string;
}

export interface CatalogoDeAdaptacoes {
  grupos: ItemDoCatalogo[];
  adaptacoes: AdaptacaoDoCatalogo[];
  canaisPreferidos: ItemDoCatalogo[];
  canaisAEvitar: ItemDoCatalogo[];
  respostasDaEmpresa: ItemDoCatalogo[];
  termoVersao: string;
}

export interface MinhaAcessibilidade {
  adaptacoes: string[];
  observacao: string | null;
  comunicacao: {
    canaisPreferidos: string[];
    canaisAEvitar: string[];
    melhorHorario: string | null;
    observacao: string | null;
  };
  privacidade: { exibirDeficienciaNoPerfil: boolean };
  /** Só o nome da categoria declarada no perfil. */
  deficiencias: { id: string; nome: string }[];
}

/** O que a pessoa marca para compartilhar numa candidatura. Tudo começa desligado. */
export interface EscolhaDeCompartilhamento {
  adaptacoes: string[];
  comunicacao: { canaisPreferidos: boolean; canaisAEvitar: boolean; melhorHorario: boolean };
  deficiencia: boolean;
  observacaoDeAdaptacao: boolean;
  observacaoDeComunicacao: boolean;
  outra: string;
}

export interface CopiaCompartilhada {
  adaptacoes?: ItemDoCatalogo[];
  comunicacao?: {
    canaisPreferidos?: ItemDoCatalogo[];
    canaisAEvitar?: ItemDoCatalogo[];
    melhorHorario?: string;
  };
  deficiencias?: { id: string; nome: string }[];
  observacoes?: { adaptacao?: string; comunicacao?: string };
  outra?: string;
}

export interface PreviaDaCandidatura {
  vaga: { id: string; titulo: string; empresa: string | null };
  dadosProfissionais: {
    nome: string | null;
    emailDeContato: string | null;
    tituloProfissional: string | null;
    cidade: string | null;
    estado: string | null;
    escolaridade: string | null;
    biografia: boolean;
    experiencias: number;
    formacoes: number;
    habilidades: number;
    curriculo: string | null;
  };
  adaptacoes: { itens: CopiaCompartilhada; total: number };
  naoCompartilhado: string[];
  termoVersao: string;
}

export type EtapaDoRascunho = "mensagem" | "adaptacoes" | "revisao";

export interface RascunhoDeCandidatura {
  id: string;
  vagaId: string;
  mensagem: string;
  selecao: Partial<EscolhaDeCompartilhamento>;
  etapa: EtapaDoRascunho;
  expiraEm: string;
  atualizadoEm: string;
  vaga?: { id: string; titulo: string; status: string; empresa: string | null } | null;
}

export type RespostaDaEmpresa = "podemos_oferecer" | "podemos_providenciar" | "precisamos_verificar" | "podemos_conversar";

/** O que a PESSOA vê do que autorizou numa candidatura. `itens` é nulo depois da retirada. */
export interface AdaptacoesDoCandidato {
  estado: "ativa" | "retirada";
  versao: number;
  finalidade: string;
  autorizadoEm: string;
  retiradoEm: string | null;
  totalItens: number;
  itens: CopiaCompartilhada | null;
  resposta: RespostaDaEmpresa | null;
  respostaMensagem: string | null;
  respondidoEm: string | null;
}

/** O que a EMPRESA vê: só a cópia autorizada e a própria resposta. */
export interface AdaptacoesDaEmpresa {
  versao: number;
  finalidade: string;
  autorizadoEm: string;
  itens: CopiaCompartilhada;
  resposta: RespostaDaEmpresa | null;
  respostaMensagem: string | null;
  respondidoEm: string | null;
}

/** Quantas informações a cópia leva. Espelha `contarItens` do servidor. */
export function contarCopia(itens: CopiaCompartilhada | null | undefined): number {
  if (!itens) return 0;

  return (
    (itens.adaptacoes?.length ?? 0) +
    (itens.comunicacao?.canaisPreferidos ? 1 : 0) +
    (itens.comunicacao?.canaisAEvitar ? 1 : 0) +
    (itens.comunicacao?.melhorHorario ? 1 : 0) +
    (itens.deficiencias?.length ? 1 : 0) +
    (itens.observacoes?.adaptacao ? 1 : 0) +
    (itens.observacoes?.comunicacao ? 1 : 0) +
    (itens.outra ? 1 : 0)
  );
}

export function escolhaVazia(): EscolhaDeCompartilhamento {
  return {
    adaptacoes: [],
    comunicacao: { canaisPreferidos: false, canaisAEvitar: false, melhorHorario: false },
    deficiencia: false,
    observacaoDeAdaptacao: false,
    observacaoDeComunicacao: false,
    outra: "",
  };
}

/** Completa uma escolha parcial (como a de um rascunho) com tudo desligado. */
export function completarEscolha(parcial: Partial<EscolhaDeCompartilhamento> | null | undefined): EscolhaDeCompartilhamento {
  const base = escolhaVazia();

  return {
    ...base,
    ...parcial,
    adaptacoes: Array.isArray(parcial?.adaptacoes) ? parcial.adaptacoes : [],
    comunicacao: { ...base.comunicacao, ...(parcial?.comunicacao ?? {}) },
    outra: typeof parcial?.outra === "string" ? parcial.outra : "",
  };
}

/** A escolha leva alguma coisa? Sem nada marcado, nada é compartilhado e a autorização não é pedida. */
export function escolhaTemConteudo(escolha: EscolhaDeCompartilhamento): boolean {
  return (
    escolha.adaptacoes.length > 0 ||
    escolha.comunicacao.canaisPreferidos ||
    escolha.comunicacao.canaisAEvitar ||
    escolha.comunicacao.melhorHorario ||
    escolha.deficiencia ||
    escolha.observacaoDeAdaptacao ||
    escolha.observacaoDeComunicacao ||
    escolha.outra.trim().length > 0
  );
}

/** As quatro respostas que a empresa pode dar a um pedido de adaptação. */
export const RESPOSTAS_DA_EMPRESA: { valor: RespostaDaEmpresa; rotulo: string }[] = [
  { valor: "podemos_oferecer", rotulo: "Podemos oferecer essa adaptação" },
  { valor: "podemos_providenciar", rotulo: "Podemos providenciar" },
  { valor: "precisamos_verificar", rotulo: "Precisamos verificar" },
  { valor: "podemos_conversar", rotulo: "Podemos conversar sobre uma alternativa" },
];

export const rotuloDaResposta = (valor: RespostaDaEmpresa | null) => RESPOSTAS_DA_EMPRESA.find((r) => r.valor === valor)?.rotulo ?? null;

/** A escolha que originou uma cópia já autorizada, para a pessoa editá-la a partir do que compartilhou. */
export function escolhaDaCopia(itens: CopiaCompartilhada | null | undefined): EscolhaDeCompartilhamento {
  return {
    adaptacoes: (itens?.adaptacoes ?? []).map((a) => a.chave),
    comunicacao: {
      canaisPreferidos: Boolean(itens?.comunicacao?.canaisPreferidos),
      canaisAEvitar: Boolean(itens?.comunicacao?.canaisAEvitar),
      melhorHorario: Boolean(itens?.comunicacao?.melhorHorario),
    },
    deficiencia: Boolean(itens?.deficiencias?.length),
    observacaoDeAdaptacao: Boolean(itens?.observacoes?.adaptacao),
    observacaoDeComunicacao: Boolean(itens?.observacoes?.comunicacao),
    outra: itens?.outra ?? "",
  };
}
