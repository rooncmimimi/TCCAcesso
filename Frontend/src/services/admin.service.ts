import api from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { Empresa, MetricasAdmin, PostagemCompleta, Usuario, Vaga } from "@/types";

/** Painel administrativo — todas as rotas exigem o papel `administrador`. */
export const adminService = {
  async relatorios(): Promise<MetricasAdmin> {
    const { data } = await api.get<{ relatorios?: MetricasAdmin; metricas?: MetricasAdmin }>(
      "/admin/relatorios",
    );
    return data.relatorios ?? data.metricas ?? {};
  },

  async empresas(params: { page?: number; limit?: number; status?: string } = {}): Promise<Paginado<Empresa>> {
    return buscarPaginado<Empresa>("/admin/empresas", "empresas", params);
  },

  async aprovarEmpresa(id: string): Promise<void> {
    await api.post(`/admin/empresas/${id}/aprovar`);
  },

  async reprovarEmpresa(id: string, motivo?: string): Promise<void> {
    await api.post(`/admin/empresas/${id}/reprovar`, { motivo: motivo ?? null });
  },

  async usuarios(params: { page?: number; limit?: number; busca?: string } = {}): Promise<Paginado<Usuario>> {
    return buscarPaginado<Usuario>("/admin/usuarios", "usuarios", params);
  },

  async bloquearUsuario(id: string, motivo?: string): Promise<void> {
    await api.post(`/admin/usuarios/${id}/bloquear`, { motivo: motivo ?? null });
  },

  async removerUsuario(id: string): Promise<void> {
    await api.delete(`/admin/usuarios/${id}`);
  },

  async postagens(params: { page?: number; limit?: number } = {}): Promise<Paginado<PostagemCompleta>> {
    return buscarPaginado<PostagemCompleta>("/admin/postagens", "postagens", params);
  },

  async removerPostagem(id: string): Promise<void> {
    await api.delete(`/admin/postagens/${id}`);
  },

  async removerComentario(id: string): Promise<void> {
    await api.delete(`/admin/comentarios/${id}`);
  },

  async vagas(params: { page?: number; limit?: number } = {}): Promise<Paginado<Vaga>> {
    return buscarPaginado<Vaga>("/admin/vagas", "vagas", params);
  },

  async ocultarVaga(id: string): Promise<void> {
    await api.post(`/admin/vagas/${id}/ocultar`);
  },
};

export default adminService;
