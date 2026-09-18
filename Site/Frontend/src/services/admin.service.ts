import clienteApi from "./api";
import type { AnexoPostagem } from "@/types";

/* Tipos devolvidos pelas rotas /admin do backend */

export interface EmpresaAdmin {
  id: string;
  usuarioId?: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  cidade?: string | null;
  estado?: string | null;
  statusAprovacao: "pendente" | "aprovada" | "reprovada" | "suspensa";
  empresaVerificada?: boolean;
  motivoReprovacao?: string | null;
  motivoSuspensao?: string | null;
  usuario?: { id: string; nome: string; email: string; ativo: boolean; bloqueado: boolean };
}

export interface ComentarioAdmin {
  id: string;
  comentario: string;
  ativo?: boolean;
  criadoEm?: string;
  usuario?: { id: string; nome: string; email: string; tipoUsuario: string };
  postagem?: { id: string; conteudo: string };
}

/**
 * Cópia mínima guardada pelo backend antes da remoção. É a única fonte para descrever o log, mesmo
 * quando a postagem ou o comentário original já não existe. Nunca inclui e-mail, CPF ou CNPJ.
 */
export interface CopiaPostagemRemovida {
  id: string;
  autorId: string;
  nomeAutor: string | null;
  conteudo: string;
  midiaPorTipo: Record<string, number>;
  totalAnexos: number;
  totalCurtidas: number;
  totalComentarios: number;
  publica: boolean;
  criadaEm: string;
}

export interface CopiaComentarioRemovido {
  id: string;
  autorId: string;
  nomeAutor: string | null;
  conteudo: string;
  postagemId: string;
  autorPostagemId: string | null;
  nomeAutorPostagem: string | null;
  criadaEm: string;
}

export interface LogAdmin {
  id: string;
  administradorId: string | null;
  acao: string;
  entidadeTipo: string | null;
  entidadeId: string | null;
  descricao: string | null;
  metadados: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  criadoEm: string;
  administrador?: { id: string; nome: string; email: string } | null;
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  tipoUsuario: "candidato" | "empresa" | "administrador";
  ativo: boolean;
  bloqueado: boolean;
  criadoEm?: string;
  ultimoLogin?: string | null;
}

export interface VagaAdmin {
  id: string;
  titulo: string;
  cidade?: string | null;
  estado?: string | null;
  modalidade?: string | null;
  status: "aberta" | "pausada" | "encerrada";
  oculta?: boolean;
  empresa?: { id: string; nomeFantasia?: string | null; statusAprovacao?: string };
}

export interface PostagemAdmin {
  id: string;
  conteudo: string;
  criadoEm: string;
  ativo?: boolean;
  publica?: boolean;
  usuario?: { id: string; nome: string; email: string; tipoUsuario: string };
  /** URLs de exibição já assinadas, com a mesma decoração do feed. */
  anexos?: AnexoPostagem[];
  totalCurtidas?: number;
  totalComentarios?: number;
}

export interface CandidaturaPorStatus {
  status: string;
  total: number | string;
}

export interface RelatoriosAdmin {
  totais: {
    usuarios: number;
    candidatos: number;
    empresas: number;
    empresasPendentes: number;
    vagas: number;
    vagasAbertas: number;
    candidaturas: number;
    postagens: number;
    usuariosBloqueados: number;
    contratacoes: number;
  };
  candidaturasPorStatus: CandidaturaPorStatus[];
  cadastrosPorMes: { mes: string; total: number | string }[];
  deficienciasMaisComuns: {
    deficienciaId: string;
    total: number | string;
    deficiencia?: { nome: string; tipo: string };
  }[];
  atualizadoEm: string;
}


type Envelope = Record<string, unknown>;

type Paginacao = { total: number; pagina: number; limite: number; totalPaginas: number };

async function listar<T>(
  url: string,
  chave: string,
  params: Record<string, unknown>,
): Promise<Envelope & Paginacao & { itens: T[] }> {
  const { data } = await clienteApi.get<Envelope>(url, { params });
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

/* Empresas */
export async function listarEmpresas(
  params: { page?: number; limit?: number; status?: EmpresaAdmin["statusAprovacao"] } = {},
) {
  const resposta = await listar<EmpresaAdmin>("/admin/empresas", "empresas", params);
  return resposta as typeof resposta & { empresas: EmpresaAdmin[] };
}

export async function aprovarEmpresa(id: string): Promise<EmpresaAdmin> {
  const { data } = await clienteApi.post<{ empresa: EmpresaAdmin }>(`/admin/empresas/${id}/aprovar`);
  return data.empresa;
}

export async function reprovarEmpresa(id: string, motivo?: string): Promise<EmpresaAdmin> {
  const { data } = await clienteApi.post<{ empresa: EmpresaAdmin }>(`/admin/empresas/${id}/reprovar`, {
    motivo: motivo ?? null,
  });
  return data.empresa;
}

export async function suspenderEmpresa(id: string, motivo?: string): Promise<EmpresaAdmin> {
  const { data } = await clienteApi.post<{ empresa: EmpresaAdmin }>(`/admin/empresas/${id}/suspender`, {
    motivo: motivo ?? null,
  });
  return data.empresa;
}

export async function reativarEmpresa(id: string): Promise<EmpresaAdmin> {
  const { data } = await clienteApi.post<{ empresa: EmpresaAdmin }>(`/admin/empresas/${id}/reativar`);
  return data.empresa;
}

/** Selo "Empresa verificada", independente de aprovação cadastral. */
export async function verificarEmpresa(id: string, verificada: boolean): Promise<EmpresaAdmin> {
  const { data } = await clienteApi.post<{ empresa: EmpresaAdmin }>(`/admin/empresas/${id}/verificar`, {
    verificada,
  });
  return data.empresa;
}

/* Usuários */
export async function listarUsuarios(
  params: { page?: number; limit?: number; nome?: string; tipoUsuario?: string } = {},
) {
  const resposta = await listar<UsuarioAdmin>("/admin/usuarios", "usuarios", {
    page: params.page,
    limit: params.limit,
    q: params.nome,
    tipo: params.tipoUsuario,
  });
  return resposta as typeof resposta & { usuarios: UsuarioAdmin[] };
}

/** Bloqueia o acesso do usuário (o backend também marca `ativo = false`). */
export async function desativarUsuario(id: string, motivo?: string) {
  const { data } = await clienteApi.post(`/admin/usuarios/${id}/bloquear`, {
    bloqueado: true,
    motivo: motivo ?? null,
  });
  return data;
}

/** Reativa a conta previamente bloqueada. */
export async function ativarUsuario(id: string) {
  const { data } = await clienteApi.post(`/admin/usuarios/${id}/bloquear`, { bloqueado: false });
  return data;
}

export async function removerUsuario(id: string, motivo?: string): Promise<void> {
  await clienteApi.delete(`/admin/usuarios/${id}`, { data: { motivo: motivo ?? null } });
}

export async function obterUsuario(id: string): Promise<UsuarioAdmin> {
  const { data } = await clienteApi.get<{ usuario: UsuarioAdmin }>(`/admin/usuarios/${id}`);
  return data.usuario;
}

/* Conteúdo */
export async function listarPostagens(params: { page?: number; limit?: number; q?: string } = {}) {
  const resposta = await listar<Record<string, unknown>>("/admin/postagens", "postagens", params);
  const postagens = (resposta.postagens as Record<string, unknown>[]).map((item) => ({
    ...item,
    criadoEm: (item.criadoEm ?? item.criadoEm ?? "") as string,
  })) as unknown as PostagemAdmin[];

  return { ...resposta, postagens, itens: postagens } as typeof resposta & { postagens: PostagemAdmin[]; itens: PostagemAdmin[] };
}

export async function removerPostagem(id: string): Promise<void> {
  await clienteApi.delete(`/admin/postagens/${id}`);
}

export async function removerComentario(id: string): Promise<void> {
  await clienteApi.delete(`/admin/comentarios/${id}`);
}

export async function listarComentarios(params: { page?: number; limit?: number; q?: string } = {}) {
  const resposta = await listar<ComentarioAdmin>("/admin/comentarios", "comentarios", params);
  return resposta as typeof resposta & { comentarios: ComentarioAdmin[] };
}

/* Vagas */
export async function listarVagas(params: { page?: number; limit?: number } = {}) {
  const resposta = await listar<VagaAdmin>("/admin/vagas", "vagas", params);
  return resposta as typeof resposta & { vagas: VagaAdmin[] };
}

/** Altera o status da vaga (rota compartilhada com empresas, liberada ao admin). */
export async function alterarStatusVaga(id: string, status: VagaAdmin["status"]) {
  const { data } = await clienteApi.patch<{ vaga: VagaAdmin }>(`/vagas/${id}/status`, { status });
  return data.vaga;
}

export async function removerVaga(id: string): Promise<void> {
  await clienteApi.delete(`/vagas/${id}`);
}

export async function ocultarVaga(id: string, oculta: boolean) {
  const { data } = await clienteApi.post(`/admin/vagas/${id}/ocultar`, { oculta });
  return data;
}

/* Relatórios */
export async function obterRelatorios(): Promise<RelatoriosAdmin> {
  const { data } = await clienteApi.get<RelatoriosAdmin>("/admin/relatorios");
  return data;
}

/* Logs de auditoria (somente leitura) */
export async function listarLogs(
  params: { page?: number; limit?: number; acao?: string; entidadeTipo?: string; entidadeId?: string; administradorId?: string } = {},
) {
  const resposta = await listar<LogAdmin>("/admin/logs", "logs", params);
  return resposta as typeof resposta & { logs: LogAdmin[] };
}

export const adminService = {
  listarEmpresas,
  aprovarEmpresa,
  reprovarEmpresa,
  suspenderEmpresa,
  reativarEmpresa,
  verificarEmpresa,
  listarUsuarios,
  ativarUsuario,
  desativarUsuario,
  removerUsuario,
  obterUsuario,
  listarPostagens,
  removerPostagem,
  removerComentario,
  listarComentarios,
  listarVagas,
  alterarStatusVaga,
  removerVaga,
  ocultarVaga,
  obterRelatorios,
  listarLogs,
};

export default adminService;
