import api from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type {
  Candidato,
  Certificado,
  Deficiencia,
  Experiencia,
  Formacao,
  Habilidade,
  Usuario,
} from "@/types";

export type RecursoPerfil = "experiencias" | "formacoes" | "certificados" | "habilidades";

/** Perfil do candidato: dados, currículo, experiências, formações, certificados e habilidades. */
export const perfilService = {
  async meuCandidato(): Promise<Candidato> {
    const { data } = await api.get<{ candidato: Candidato }>("/candidatos/me");
    return data.candidato;
  },

  async candidatoPorId(id: string): Promise<Candidato> {
    const { data } = await api.get<{ candidato: Candidato }>(`/candidatos/${id}`);
    return data.candidato;
  },

  async perfilCompleto(candidatoId: string): Promise<Candidato> {
    const { data } = await api.get<{ candidato: Candidato }>(`/perfil/candidatos/${candidatoId}`);
    return data.candidato;
  },

  /** Perfil consolidado (dados + experiências + formações + certificados + habilidades + deficiências) por usuarioId — usado para abrir o perfil de outra pessoa a partir do feed. */
  async perfilCompletoPorUsuario(usuarioId: string): Promise<Candidato> {
    const { data } = await api.get<{ candidato: Candidato }>(`/perfil/candidatos/usuario/${usuarioId}`);
    return data.candidato;
  },

  async listarCandidatos(params: { page?: number; limit?: number; busca?: string } = {}) {
    return buscarPaginado<Candidato>("/candidatos", "candidatos", params);
  },

  async atualizarCandidato(id: string, payload: Record<string, unknown>): Promise<Candidato> {
    const { data } = await api.put<{ candidato: Candidato }>(`/candidatos/${id}`, payload);
    return data.candidato;
  },

  async enviarCurriculo(candidatoId: string, arquivo: File): Promise<Candidato> {
    const form = new FormData();
    form.append("curriculo", arquivo);

    const { data } = await api.patch<{ candidato: Candidato }>(
      `/candidatos/${candidatoId}/curriculo`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.candidato;
  },

  async adicionarDeficiencia(candidatoId: string, payload: Record<string, unknown>) {
    const { data } = await api.post(`/candidatos/${candidatoId}/deficiencias`, payload);
    return data;
  },

  async removerDeficiencia(candidatoId: string, deficienciaId: string) {
    await api.delete(`/candidatos/${candidatoId}/deficiencias/${deficienciaId}`);
  },

  /** Catálogo público de deficiências, usado para o seletor no perfil. */
  async catalogoDeficiencias(): Promise<Deficiencia[]> {
    const { data } = await api.get<{ deficiencias: Deficiencia[] }>("/deficiencias");
    return data.deficiencias ?? [];
  },

  /* -------- Recursos do perfil (CRUD genérico) -------- */
  async listarRecurso<T = Experiencia | Formacao | Certificado | Habilidade>(
    recurso: RecursoPerfil,
  ): Promise<T[]> {
    const { data } = await api.get<{ registros: T[] }>(`/perfil/${recurso}`);
    return data.registros ?? [];
  },

  async criarRecurso<T>(recurso: RecursoPerfil, payload: Record<string, unknown>): Promise<T> {
    const { data } = await api.post<{ registro: T }>(`/perfil/${recurso}`, payload);
    return data.registro;
  },

  async atualizarRecurso<T>(
    recurso: RecursoPerfil,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const { data } = await api.put<{ registro: T }>(`/perfil/${recurso}/${id}`, payload);
    return data.registro;
  },

  async removerRecurso(recurso: RecursoPerfil, id: string): Promise<void> {
    await api.delete(`/perfil/${recurso}/${id}`);
  },

  /* -------- Conta / usuário -------- */
  async atualizarUsuario(id: string, payload: Record<string, unknown>): Promise<Usuario> {
    const { data } = await api.put<{ usuario: Usuario }>(`/usuarios/${id}`, payload);
    return data.usuario;
  },

  async atualizarFoto(id: string, arquivo: File): Promise<Usuario> {
    const form = new FormData();
    form.append("foto", arquivo);

    const { data } = await api.patch<{ usuario: Usuario }>(`/usuarios/${id}/foto`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.usuario;
  },

  async atualizarCapa(id: string, arquivo: File): Promise<Usuario> {
    const form = new FormData();
    form.append("capa", arquivo);

    const { data } = await api.patch<{ usuario: Usuario }>(`/usuarios/${id}/capa`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.usuario;
  },

  async alterarSenha(payload: { senhaAtual: string; novaSenha: string }): Promise<void> {
    await api.patch("/auth/senha", payload);
  },
};

export type { Paginado };
export default perfilService;
