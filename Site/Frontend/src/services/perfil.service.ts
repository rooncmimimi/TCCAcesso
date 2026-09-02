import api from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type {
  Candidato,
  Certificado,
  Deficiencia,
  Experiencia,
  Formacao,
  Habilidade,
  RascunhoCurriculo,
  Usuario,
} from "@/types";

export type RecursoPerfil = "experiencias" | "formacoes" | "certificados" | "habilidades";

/** Dados públicos mínimos de qualquer usuário — nunca inclui e-mail/telefone/documentos. */
export interface UsuarioPublico {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  capaPerfil?: string | null;
  tipoUsuario?: "candidato" | "empresa" | "administrador";
}

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

  /**
   * Dados públicos mínimos de qualquer usuário — fallback usado quando o
   * alvo não tem registro de candidato nem de empresa (hoje, administradores).
   */
  async usuarioPublico(usuarioId: string): Promise<UsuarioPublico> {
    const { data } = await api.get<{ usuario: UsuarioPublico }>(`/perfil/usuario/${usuarioId}`);
    return data.usuario;
  },

  async listarCandidatos(params: { page?: number; limit?: number; busca?: string } = {}) {
    return buscarPaginado<Candidato>("/candidatos", "candidatos", params);
  },

  async atualizarCandidato(id: string, payload: Record<string, unknown>): Promise<Candidato> {
    const { data } = await api.put<{ candidato: Candidato }>(`/candidatos/${id}`, payload);
    return data.candidato;
  },

  /**
   * URL assinada e temporária para VISUALIZAR o currículo — nunca
   * persistir, buscar sempre sob demanda no momento do clique (mesmo
   * princípio da Fase 7 para mídia de postagem). Backend reautoriza do
   * zero (dono, empresa com candidatura ou administrador).
   */
  async urlCurriculo(candidatoId: string): Promise<{ url: string; nomeArquivo: string | null }> {
    const { data } = await api.get<{ url: string; nomeArquivo: string | null }>(
      `/candidatos/${candidatoId}/curriculo`,
    );
    return { url: data.url, nomeArquivo: data.nomeArquivo };
  },

  /** Mesma autorização acima, mas com download forçado (Content-Disposition: attachment). */
  async urlDownloadCurriculo(candidatoId: string): Promise<{ url: string; nomeArquivo: string | null }> {
    const { data } = await api.get<{ url: string; nomeArquivo: string | null }>(
      `/candidatos/${candidatoId}/curriculo/download`,
    );
    return { url: data.url, nomeArquivo: data.nomeArquivo };
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

  /**
   * Extrai um RASCUNHO do currículo (PDF/DOCX) para revisão — nunca grava
   * nada no perfil sozinho, e o arquivo enviado aqui não vira o currículo
   * oficial (isso continua sendo `enviarCurriculo`, chamado à parte).
   */
  async importarCurriculo(candidatoId: string, arquivo: File): Promise<RascunhoCurriculo> {
    const form = new FormData();
    form.append("curriculo", arquivo);

    const { data } = await api.post<{ rascunho: RascunhoCurriculo }>(
      `/candidatos/${candidatoId}/curriculo/importar`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.rascunho;
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
