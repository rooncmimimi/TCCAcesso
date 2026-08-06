import axios from "axios";
import api, { API_BASE_URL } from "./api";
import type { HomePublica, Vaga } from "@/types";

/** Cliente sem token — usado nas páginas públicas (home e "Sobre nós"). */
const publico = axios.create({ baseURL: API_BASE_URL, timeout: 20_000 });

export const publicoService = {
  async home(): Promise<HomePublica> {
    const { data } = await publico.get<Record<string, unknown>>("/publico/home");
    const conteudo = (data?.home ?? data?.dados ?? data) as HomePublica;
    return conteudo ?? {};
  },

  async vagas(params: { limit?: number } = {}): Promise<Vaga[]> {
    const { data } = await publico.get<Record<string, unknown>>("/publico/vagas", { params });
    const lista = (data?.vagas ?? data?.dados ?? []) as Vaga[];
    return Array.isArray(lista) ? lista : [];
  },
};

/** Busca global (usuários, empresas, vagas e publicações). */
export const buscaService = {
  async global(termo: string, params: { tipo?: string; limit?: number } = {}) {
    const { data } = await api.get<Record<string, unknown>>("/busca", {
      params: { q: termo, busca: termo, ...params },
    });
    return data;
  },
};

export default publicoService;
