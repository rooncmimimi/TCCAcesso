import api from "./api";
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
    const { data } = await api.get<{ metricas: MetricasCandidato }>("/dashboard/candidato");
    return data.metricas ?? {};
  },

  async empresa(): Promise<MetricasEmpresa> {
    const { data } = await api.get<{ metricas: MetricasEmpresa }>("/dashboard/empresa");
    return data.metricas ?? {};
  },

  async admin(): Promise<MetricasAdmin> {
    const { data } = await api.get<{ metricas: MetricasAdmin }>("/dashboard/admin");
    return data.metricas ?? {};
  },

  /**
   * `GET /dashboard/favoritos` devolve registros de `FavoritoVaga` (chave
   * `"favoritos"`, cada item com a vaga aninhada em `.vaga`), não uma
   * lista achatada de vagas — bug pré-existente encontrado durante o
   * Bloco 6 (Fase 9): a chamada usava a chave errada (`"vagas"`, que não
   * existe na resposta) e nunca desembrulhava `.vaga`, então `dados`
   * sempre vinha vazio e a tela de favoritos nunca refletia nada, com
   * qualquer cache. Corrigido aqui, sem mudar o contrato desta função
   * (`Paginado<Vaga>` continua igual) — nenhum consumidor precisou mudar.
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
    const { data } = await api.get<{ candidatura: Candidatura }>(`/candidaturas/${id}`);
    return data.candidatura;
  },

  async atualizarStatus(id: string, status: string): Promise<Candidatura> {
    const { data } = await api.patch<{ candidatura: Candidatura }>(`/candidaturas/${id}/status`, {
      status,
    });
    return data.candidatura;
  },

  async cancelar(id: string): Promise<void> {
    await api.patch(`/candidaturas/${id}/cancelar`);
  },

  async daVaga(vagaId: string, params: { page?: number; limit?: number } = {}) {
    return buscarPaginado<Candidatura>(`/vagas/${vagaId}/candidaturas`, "candidaturas", params);
  },

  async candidatar(vagaId: string, mensagem?: string): Promise<Candidatura> {
    const { data } = await api.post<{ candidatura: Candidatura }>(`/vagas/${vagaId}/candidaturas`, {
      mensagem: mensagem ?? null,
    });
    return data.candidatura;
  },
};

export default dashboardService;
