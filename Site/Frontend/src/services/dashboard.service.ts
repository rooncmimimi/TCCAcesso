import clienteApi from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type {
  Candidatura,
  MetricasAdmin,
  MetricasCandidato,
  MetricasEmpresa,
  Vaga,
} from "@/types";

/** Dashboards de candidato, empresa e administração. */
export const dashboardService = {
  async candidato(): Promise<MetricasCandidato> {
    const { data } = await clienteApi.get<{ metricas: MetricasCandidato }>("/dashboard/candidato");
    return data.metricas ?? {};
  },

  async empresa(): Promise<MetricasEmpresa> {
    const { data } = await clienteApi.get<{ metricas: MetricasEmpresa }>("/dashboard/empresa");
    return data.metricas ?? {};
  },

  async admin(): Promise<MetricasAdmin> {
    const { data } = await clienteApi.get<{ metricas: MetricasAdmin }>("/dashboard/admin");
    return data.metricas ?? {};
  },

  /**
   * `GET /dashboard/favoritos` devolve registros de `FavoritoVaga` na chave `"favoritos"`, cada um
   * com a vaga em `.vaga`, e não uma lista de vagas. Aqui eles são desembrulhados para manter o
   * retorno `Paginado<Vaga>`.
   */
  async favoritos(params: { page?: number; limit?: number } = {}): Promise<Paginado<Vaga>> {
    const paginado = await buscarPaginado<{ vaga: Vaga | null }>("/dashboard/favoritos", "favoritos", params);
    return { ...paginado, dados: paginado.dados.map((item) => item.vaga).filter((v): v is Vaga => Boolean(v)) };
  },
};

/** Candidaturas do candidato e da empresa. */
export const candidaturasService = {
  async minhas(params: { page?: number; limit?: number } = {}): Promise<Paginado<Candidatura>> {
    return buscarPaginado<Candidatura>("/candidaturas/minhas", "candidaturas", params);
  },

  async detalhar(id: string): Promise<Candidatura> {
    const { data } = await clienteApi.get<{ candidatura: Candidatura }>(`/candidaturas/${id}`);
    return data.candidatura;
  },

  async atualizarStatus(id: string, status: string): Promise<Candidatura> {
    const { data } = await clienteApi.patch<{ candidatura: Candidatura }>(`/candidaturas/${id}/status`, {
      status,
    });
    return data.candidatura;
  },

  async cancelar(id: string): Promise<void> {
    await clienteApi.patch(`/candidaturas/${id}/cancelar`);
  },

  async daVaga(vagaId: string, params: { page?: number; limit?: number } = {}) {
    return buscarPaginado<Candidatura>(`/vagas/${vagaId}/candidaturas`, "candidaturas", params);
  },

  async candidatar(vagaId: string, mensagem?: string): Promise<Candidatura> {
    const { data } = await clienteApi.post<{ candidatura: Candidatura }>(`/vagas/${vagaId}/candidaturas`, {
      mensagem: mensagem ?? null,
    });
    return data.candidatura;
  },
};

export default dashboardService;
