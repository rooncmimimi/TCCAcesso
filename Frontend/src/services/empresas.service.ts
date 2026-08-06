import api from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { Empresa, ResumoSeguidores, SugestaoPerfil, Vaga } from "@/types";

/** Empresas e relacionamento de seguidores. */
export const empresasService = {
  async listar(params: { page?: number; limit?: number; busca?: string } = {}): Promise<Paginado<Empresa>> {
    return buscarPaginado<Empresa>("/empresas", "empresas", params);
  },

  async parceiras(): Promise<Empresa[]> {
    const { data } = await api.get<{ empresas: Empresa[] }>("/empresas/parceiras");
    return data.empresas ?? [];
  },

  async minhaEmpresa(): Promise<Empresa> {
    const { data } = await api.get<{ empresa: Empresa }>("/empresas/me");
    return data.empresa;
  },

  async detalhar(id: string): Promise<Empresa> {
    const { data } = await api.get<{ empresa: Empresa }>(`/empresas/${id}`);
    return data.empresa;
  },

  async atualizar(id: string, payload: Record<string, unknown>): Promise<Empresa> {
    const { data } = await api.put<{ empresa: Empresa }>(`/empresas/${id}`, payload);
    return data.empresa;
  },

  async atualizarLogo(id: string, arquivo: File): Promise<Empresa> {
    const form = new FormData();
    form.append("logo", arquivo);

    const { data } = await api.patch<{ empresa: Empresa }>(`/empresas/${id}/logo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.empresa;
  },

  async vagasDaEmpresa(params: { page?: number; limit?: number } = {}): Promise<Paginado<Vaga>> {
    return buscarPaginado<Vaga>("/vagas/minhas", "vagas", params);
  },

  async seguindo(): Promise<Empresa[]> {
    const { data } = await api.get<{ empresas: Empresa[] }>("/empresas/seguindo");
    return data.empresas ?? [];
  },
};

/** Seguir usuários e empresas. */
export const seguidoresService = {
  async sugestoes(): Promise<SugestaoPerfil[]> {
    const { data } = await api.get<{ sugestoes: SugestaoPerfil[] }>("/seguir/sugestoes");
    return data.sugestoes ?? [];
  },

  async alternarUsuario(usuarioId: string): Promise<{ seguindo: boolean }> {
    const { data } = await api.post<{ seguindo: boolean }>(`/seguir/usuarios/${usuarioId}`);
    return { seguindo: Boolean(data.seguindo) };
  },

  async alternarEmpresa(empresaId: string): Promise<{ seguindo: boolean }> {
    const { data } = await api.post<{ seguindo: boolean }>(`/seguir/empresas/${empresaId}`);
    return { seguindo: Boolean(data.seguindo) };
  },

  async seguidores(usuarioId: string, params: { page?: number; limit?: number } = {}) {
    return buscarPaginado<SugestaoPerfil>(`/seguir/seguidores/${usuarioId}`, "seguidores", params);
  },

  async seguindoDe(usuarioId: string, params: { page?: number; limit?: number } = {}) {
    return buscarPaginado<SugestaoPerfil>(`/seguir/seguindo/${usuarioId}`, "seguindo", params);
  },

  async resumo(usuarioId: string): Promise<ResumoSeguidores> {
    const { data } = await api.get<{ resumo: ResumoSeguidores }>(`/seguir/resumo/${usuarioId}`);
    return data.resumo ?? { seguidores: 0, seguindo: 0 };
  },
};

export default empresasService;
