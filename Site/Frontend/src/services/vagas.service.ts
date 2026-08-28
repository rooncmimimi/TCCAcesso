import api from "./api";
import type { Candidatura, PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga } from "@/types";

/** Parâmetros aceitos pela listagem paginada de vagas (`GET /vagas`). */
export interface FiltroVagas {
  page?: number;
  limit?: number;
  q?: string;
  cidade?: string;
  estado?: string;
  modalidade?: string;
  contrato?: string;
  exclusivaPcd?: boolean;
  publicoAlvo?: PublicoAlvoVaga;
  /** Enviado como string separada por vírgula — o backend usa `Op.contains` (índice GIN). */
  recursosAcessibilidade?: RecursoAcessibilidadeVaga[];
  status?: string;
  empresaId?: string;
}

/** Envelope paginado do backend Express. */
export interface ListaVagas {
  vagas: Vaga[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface EstatisticasVaga {
  totalCandidaturas?: number;
  porStatus?: { status: string; total: number | string }[];
  [chave: string]: unknown;
}

function normalizar(data: Record<string, unknown>, params: FiltroVagas): ListaVagas {
  const vagas = (Array.isArray(data?.vagas) ? data.vagas : []) as Vaga[];
  return {
    vagas,
    total: Number(data?.total ?? vagas.length),
    pagina: Number(data?.pagina ?? params.page ?? 1),
    limite: Number(data?.limite ?? params.limit ?? 10),
    totalPaginas: Number(data?.totalPaginas ?? 1),
  };
}

/** Serviço de vagas — espelha exatamente as rotas `/vagas` do backend. */
export const vagasService = {
  async listar(filtro: FiltroVagas = {}): Promise<ListaVagas> {
    const params: Record<string, unknown> = { ...filtro };
    if (!filtro.exclusivaPcd) delete params.exclusivaPcd;
    if (filtro.recursosAcessibilidade?.length) {
      params.recursosAcessibilidade = filtro.recursosAcessibilidade.join(",");
    } else {
      delete params.recursosAcessibilidade;
    }
    const { data } = await api.get<Record<string, unknown>>("/vagas", { params });
    return normalizar(data, filtro);
  },

  /** Vagas publicadas pela empresa autenticada. */
  async minhas(filtro: FiltroVagas = {}): Promise<ListaVagas> {
    const { data } = await api.get<Record<string, unknown>>("/vagas/minhas", { params: filtro });
    return normalizar(data, filtro);
  },

  async detalhar(id: string): Promise<Vaga> {
    const { data } = await api.get<{ vaga: Vaga }>(`/vagas/${id}`);
    return data.vaga;
  },

  async criar(payload: Record<string, unknown>): Promise<Vaga> {
    const { data } = await api.post<{ vaga: Vaga }>("/vagas", payload);
    return data.vaga;
  },

  async atualizar(id: string, payload: Record<string, unknown>): Promise<Vaga> {
    const { data } = await api.put<{ vaga: Vaga }>(`/vagas/${id}`, payload);
    return data.vaga;
  },

  async alterarStatus(id: string, status: string): Promise<Vaga> {
    const { data } = await api.patch<{ vaga: Vaga }>(`/vagas/${id}/status`, { status });
    return data.vaga;
  },

  async remover(id: string): Promise<void> {
    await api.delete(`/vagas/${id}`);
  },

  async estatisticas(id: string): Promise<EstatisticasVaga> {
    const { data } = await api.get<Record<string, unknown>>(`/vagas/${id}/estatisticas`);
    return data as EstatisticasVaga;
  },

  /** Candidata o usuário autenticado (`POST /vagas/:vagaId/candidaturas`). */
  async candidatar(vagaId: string, mensagem?: string): Promise<Candidatura> {
    const { data } = await api.post<{ candidatura: Candidatura }>(
      `/vagas/${vagaId}/candidaturas`,
      { mensagem: mensagem ?? null },
    );
    return data.candidatura;
  },

  /** Alterna a vaga na lista de favoritos do candidato. */
  async favoritar(vagaId: string): Promise<{ favoritada: boolean }> {
    const { data } = await api.post<{ favoritada?: boolean; favorito?: boolean }>(
      `/vagas/${vagaId}/favoritar`,
    );
    return { favoritada: Boolean(data.favoritada ?? data.favorito) };
  },
};

export default vagasService;
