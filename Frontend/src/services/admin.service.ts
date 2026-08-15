import api from "./api";

/* ==========================================================
   Tipos devolvidos pelas rotas /admin do backend Express
   ========================================================== */

export interface EmpresaAdmin {
  id: string;
  usuarioId?: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  cidade?: string | null;
  estado?: string | null;
  statusAprovacao: "pendente" | "aprovada" | "reprovada";
  empresaVerificada?: boolean;
  motivoReprovacao?: string | null;
  usuario?: { id: string; nome: string; email: string; ativo: boolean; bloqueado: boolean };
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  tipoUsuario: "candidato" | "empresa" | "administrador";
  ativo: boolean;
  bloqueado: boolean;
  created_at?: string;
}

export interface VagaAdmin {
  id: string;
  titulo: string;
  cidade?: string | null;
  estado?: string | null;
  modalidade?: string | null;
  status: "Aberta" | "Pausada" | "Encerrada";
  oculta?: boolean;
  empresa?: { id: string; nomeFantasia?: string | null; statusAprovacao?: string };
}

export interface PostagemAdmin {
  id: string;
  conteudo: string;
  createdAt: string;
  ativo?: boolean;
  usuario?: { id: string; nome: string; email: string; tipoUsuario: string };
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

/** Envelope paginado das rotas administrativas (chave dinâmica + metadados). */
export interface ListaAdmin<T, K extends string> {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  itens: T[];
  // chave nomeada devolvida pelo backend (empresas, usuarios, vagas, postagens)
  // é replicada para manter a leitura idiomática nos componentes.
  [chave: string]: unknown;
}

type Envelope = Record<string, unknown>;

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
   Empresas
   ========================================================== */
export async function listarEmpresas(
  params: { page?: number; limit?: number; status?: EmpresaAdmin["statusAprovacao"] } = {},
) {
  const resposta = await listar<EmpresaAdmin>("/admin/empresas", "empresas", params);
  return resposta as typeof resposta & { empresas: EmpresaAdmin[] };
}

export async function aprovarEmpresa(id: string): Promise<EmpresaAdmin> {
  const { data } = await api.post<{ empresa: EmpresaAdmin }>(`/admin/empresas/${id}/aprovar`);
  return data.empresa;
}

export async function reprovarEmpresa(id: string, motivo?: string): Promise<EmpresaAdmin> {
  const { data } = await api.post<{ empresa: EmpresaAdmin }>(`/admin/empresas/${id}/reprovar`, {
    motivo: motivo ?? null,
  });
  return data.empresa;
}

/* ==========================================================
   Usuários
   ========================================================== */
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
  const { data } = await api.post(`/admin/usuarios/${id}/bloquear`, {
    bloqueado: true,
    motivo: motivo ?? null,
  });
  return data;
}

/** Reativa a conta previamente bloqueada. */
export async function ativarUsuario(id: string) {
  const { data } = await api.post(`/admin/usuarios/${id}/bloquear`, { bloqueado: false });
  return data;
}

export async function removerUsuario(id: string): Promise<void> {
  await api.delete(`/admin/usuarios/${id}`);
}

/* ==========================================================
   Conteúdo
   ========================================================== */
export async function listarPostagens(params: { page?: number; limit?: number } = {}) {
  const resposta = await listar<Record<string, unknown>>("/admin/postagens", "postagens", params);
  const postagens = (resposta.postagens as Record<string, unknown>[]).map((item) => ({
    ...item,
    createdAt: (item.createdAt ?? item.created_at ?? "") as string,
  })) as unknown as PostagemAdmin[];

  return { ...resposta, postagens, itens: postagens } as typeof resposta & { postagens: PostagemAdmin[]; itens: PostagemAdmin[] };
}

export async function removerPostagem(id: string): Promise<void> {
  await api.delete(`/admin/postagens/${id}`);
}

export async function removerComentario(id: string): Promise<void> {
  await api.delete(`/admin/comentarios/${id}`);
}

/* ==========================================================
   Vagas
   ========================================================== */
export async function listarVagas(params: { page?: number; limit?: number } = {}) {
  const resposta = await listar<VagaAdmin>("/admin/vagas", "vagas", params);
  return resposta as typeof resposta & { vagas: VagaAdmin[] };
}

/** Altera o status da vaga (rota compartilhada com empresas, liberada ao admin). */
export async function alterarStatusVaga(id: string, status: VagaAdmin["status"]) {
  const { data } = await api.patch<{ vaga: VagaAdmin }>(`/vagas/${id}/status`, { status });
  return data.vaga;
}

export async function removerVaga(id: string): Promise<void> {
  await api.delete(`/vagas/${id}`);
}

export async function ocultarVaga(id: string, oculta: boolean) {
  const { data } = await api.post(`/admin/vagas/${id}/ocultar`, { oculta });
  return data;
}

/* ==========================================================
   Relatórios
   ========================================================== */
export async function obterRelatorios(): Promise<RelatoriosAdmin> {
  const { data } = await api.get<RelatoriosAdmin>("/admin/relatorios");
  return data;
}

export const adminService = {
  listarEmpresas,
  aprovarEmpresa,
  reprovarEmpresa,
  listarUsuarios,
  ativarUsuario,
  desativarUsuario,
  removerUsuario,
  listarPostagens,
  removerPostagem,
  removerComentario,
  listarVagas,
  alterarStatusVaga,
  removerVaga,
  ocultarVaga,
  obterRelatorios,
};

export default adminService;
