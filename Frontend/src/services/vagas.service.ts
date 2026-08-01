import api from "./api";
import type { Vaga } from "@/types";

/** Parâmetros aceitos pela listagem paginada de vagas. */
export interface FiltroVagas {
  pagina?: number;
  limite?: number;
  busca?: string;
  modalidade?: string;
  exclusivaPcd?: boolean;
}

interface RespostaPaginada<T> {
  dados: T[];
  total: number;
  pagina: number;
  limite: number;
}

/**
 * Serviço de vagas — espelha as rotas `/vagas` do backend.
 */
export const vagasService = {
  async listar(filtro: FiltroVagas = {}): Promise<RespostaPaginada<Vaga>> {
    const { data } = await api.get<RespostaPaginada<Vaga>>("/vagas", { params: filtro });
    return data;
  },

  async detalhar(id: string): Promise<Vaga> {
    const { data } = await api.get<{ dados: Vaga }>(`/vagas/${id}`);
    return data.dados;
  },

  async candidatar(vagaId: string): Promise<void> {
    await api.post("/candidaturas", { vagaId });
  },
};

export default vagasService;
