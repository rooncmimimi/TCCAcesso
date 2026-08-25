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

export interface ResultadoBuscaUsuario {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario: "candidato" | "empresa" | "administrador";
  candidato?: {
    id: string;
    tituloProfissional?: string | null;
    cidade?: string | null;
    estado?: string | null;
  } | null;
}

export interface ResultadoBuscaEmpresa {
  id: string;
  usuarioId: string;
  nomeFantasia?: string | null;
  razaoSocial: string;
  setor?: string | null;
  cidade?: string | null;
  estado?: string | null;
  logo?: string | null;
  empresaVerificada?: boolean;
}

export interface ResultadoBuscaVaga {
  id: string;
  titulo: string;
  cidade?: string | null;
  estado?: string | null;
  empresa?: { id: string; nomeFantasia?: string | null; logo?: string | null } | null;
}

export interface ResultadoBuscaPostagem {
  id: string;
  conteudo: string;
  usuario?: { id: string; nome: string; fotoPerfil?: string | null } | null;
}

export interface ResultadoBuscaGlobal {
  termo: string;
  tipo: string;
  total: number;
  totais?: { usuarios: number; empresas: number; vagas: number; postagens: number };
  resultados: {
    usuarios?: ResultadoBuscaUsuario[];
    empresas?: ResultadoBuscaEmpresa[];
    vagas?: ResultadoBuscaVaga[];
    postagens?: ResultadoBuscaPostagem[];
  };
}

/** Busca global (usuários, empresas, vagas e publicações). */
export const buscaService = {
  async global(termo: string, params: { tipo?: string; limit?: number } = {}): Promise<ResultadoBuscaGlobal> {
    const { data } = await api.get<ResultadoBuscaGlobal>("/busca", {
      params: { q: termo, busca: termo, ...params },
    });
    return data;
  },
};

export default publicoService;
