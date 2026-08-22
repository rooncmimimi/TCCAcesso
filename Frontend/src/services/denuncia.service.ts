import api from "./api";

/* ==========================================================
   Tipos devolvidos pelas rotas /denuncias e /admin/denuncias
   ========================================================== */

export type EntidadeDenunciaTipo =
  | "postagem"
  | "comentario"
  | "usuario"
  | "mensagem"
  | "vaga"
  | "empresa";

export type MotivoDenuncia =
  | "spam"
  | "conteudo_ofensivo"
  | "discurso_odio"
  | "assedio"
  | "fraude"
  | "informacao_falsa"
  | "conteudo_inadequado"
  | "outro";

export type StatusDenuncia = "pendente" | "em_analise" | "resolvida" | "rejeitada" | "arquivada";

/** Ação de moderação aceita ao resolver, de acordo com o entidadeTipo da denúncia. */
export const ACAO_POR_TIPO: Partial<Record<EntidadeDenunciaTipo, string>> = {
  usuario: "bloquear",
  postagem: "remover",
  comentario: "remover",
  vaga: "ocultar",
  empresa: "suspender",
};

export const MOTIVO_ROTULO: Record<MotivoDenuncia, string> = {
  spam: "Spam",
  conteudo_ofensivo: "Conteúdo ofensivo",
  discurso_odio: "Discurso de ódio",
  assedio: "Assédio",
  fraude: "Fraude",
  informacao_falsa: "Informação falsa",
  conteudo_inadequado: "Conteúdo inadequado",
  outro: "Outro",
};

export interface Denuncia {
  id: string;
  denuncianteId: string;
  entidadeTipo: EntidadeDenunciaTipo;
  entidadeId: string;
  motivo: MotivoDenuncia;
  descricao: string | null;
  status: StatusDenuncia;
  adminResponsavelId: string | null;
  observacaoAdmin: string | null;
  resolvidoEm: string | null;
  created_at: string;
  denunciante?: { id: string; nome: string; email: string };
  adminResponsavel?: { id: string; nome: string } | null;
  previaEntidade?: Record<string, unknown> | null;
}

export interface MensagemContexto {
  id: string;
  conversaId: string;
  remetenteId: string;
  conteudo: string;
  created_at: string;
}

interface Envelope {
  [chave: string]: unknown;
}

type Paginacao = { total: number; pagina: number; limite: number; totalPaginas: number };

async function listar<T>(
  url: string,
  chave: string,
  params: Record<string, unknown>,
): Promise<Envelope & Paginacao & { itens: T[] }> {
  const { data } = await api.get<Envelope>(url, { params });
  const itens = (Array.isArray(data?.[chave]) ? data[chave] : []) as T[];

  return {
    ...data,
    [chave]: itens,
    itens,
    total: Number(data?.total ?? itens.length),
    pagina: Number(data?.pagina ?? params.page ?? 1),
    limite: Number(data?.limite ?? params.limit ?? 10),
    totalPaginas: Number(data?.totalPaginas ?? 1),
  };
}

/* ==========================================================
   Criação (qualquer usuário autenticado)
   ========================================================== */
export async function criarDenuncia(payload: {
  entidadeTipo: EntidadeDenunciaTipo;
  entidadeId: string;
  motivo: MotivoDenuncia;
  descricao?: string;
}): Promise<Denuncia> {
  const { data } = await api.post<{ denuncia: Denuncia }>("/denuncias", payload);
  return data.denuncia;
}

/* ==========================================================
   Painel administrativo
   ========================================================== */
export async function listarDenuncias(
  params: {
    page?: number;
    limit?: number;
    status?: StatusDenuncia;
    entidadeTipo?: EntidadeDenunciaTipo;
    motivo?: MotivoDenuncia;
    entidadeId?: string;
  } = {},
) {
  const resposta = await listar<Denuncia>("/admin/denuncias", "denuncias", params);
  return resposta as typeof resposta & { denuncias: Denuncia[] };
}

export async function obterDenuncia(id: string): Promise<Denuncia> {
  const { data } = await api.get<{ denuncia: Denuncia }>(`/admin/denuncias/${id}`);
  return data.denuncia;
}

export async function atribuirDenuncia(id: string): Promise<Denuncia> {
  const { data } = await api.patch<{ denuncia: Denuncia }>(`/admin/denuncias/${id}/atribuir`);
  return data.denuncia;
}

export async function resolverDenuncia(
  id: string,
  payload: { observacao?: string; acao?: string },
): Promise<Denuncia> {
  const { data } = await api.patch<{ denuncia: Denuncia }>(`/admin/denuncias/${id}/resolver`, payload);
  return data.denuncia;
}

export async function rejeitarDenuncia(id: string, observacao?: string): Promise<Denuncia> {
  const { data } = await api.patch<{ denuncia: Denuncia }>(`/admin/denuncias/${id}/rejeitar`, {
    observacao,
  });
  return data.denuncia;
}

export async function arquivarDenuncia(id: string, observacao?: string): Promise<Denuncia> {
  const { data } = await api.patch<{ denuncia: Denuncia }>(`/admin/denuncias/${id}/arquivar`, {
    observacao,
  });
  return data.denuncia;
}

export async function obterContextoMensagem(id: string): Promise<{
  mensagemDenunciada: MensagemContexto;
  antes: MensagemContexto[];
  depois: MensagemContexto[];
}> {
  const { data } = await api.get<{
    mensagemDenunciada: MensagemContexto;
    antes: MensagemContexto[];
    depois: MensagemContexto[];
  }>(`/admin/denuncias/${id}/contexto-mensagem`);
  return data;
}

export const denunciaService = {
  criarDenuncia,
  listarDenuncias,
  obterDenuncia,
  atribuirDenuncia,
  resolverDenuncia,
  rejeitarDenuncia,
  arquivarDenuncia,
  obterContextoMensagem,
};

export default denunciaService;
