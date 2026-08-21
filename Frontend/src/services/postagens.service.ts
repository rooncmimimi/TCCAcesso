import api from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { ComentarioCompleto, CompartilhamentoCompleto, PostagemCompleta } from "@/types";

export interface FiltroFeed {
  page?: number;
  limit?: number;
  usuarioId?: string;
  busca?: string;
  [chave: string]: unknown;
}

export interface NovaPostagem {
  conteudo: string;
  publica?: boolean;
  /** Arquivos enviados junto da publicação (até 4). */
  anexos?: File[];
}

/** Feed: publicações, curtidas, comentários, respostas e compartilhamentos. */
export const postagensService = {
  async listar(filtro: FiltroFeed = {}): Promise<Paginado<PostagemCompleta>> {
    return buscarPaginado<PostagemCompleta>("/postagens", "postagens", filtro);
  },

  async detalhar(id: string): Promise<PostagemCompleta> {
    const { data } = await api.get<{ postagem: PostagemCompleta }>(`/postagens/${id}`);
    return data.postagem;
  },

  async criar({ conteudo, publica = true, anexos = [] }: NovaPostagem): Promise<PostagemCompleta> {
    const form = new FormData();
    form.append("conteudo", conteudo);
    form.append("publica", String(publica));
    // O campo precisa se chamar "arquivos" — é o nome que o Multer espera
    // em `uploadAnexos.array("arquivos", 4)` (Backend/src/routes/postagemRoutes.js).
    anexos.slice(0, 4).forEach((arquivo) => form.append("arquivos", arquivo));

    const { data } = await api.post<{ postagem: PostagemCompleta }>("/postagens", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.postagem;
  },

  async atualizar(id: string, payload: { conteudo?: string; publica?: boolean }): Promise<PostagemCompleta> {
    const { data } = await api.put<{ postagem: PostagemCompleta }>(`/postagens/${id}`, payload);
    return data.postagem;
  },

  async remover(id: string): Promise<void> {
    await api.delete(`/postagens/${id}`);
  },

  /* ---------------- Curtidas ---------------- */
  async alternarCurtida(postagemId: string): Promise<{ curtido: boolean; totalCurtidas: number }> {
    const { data } = await api.post<{ curtido: boolean; totalCurtidas: number }>(
      `/postagens/${postagemId}/curtidas`,
    );
    return { curtido: Boolean(data.curtido), totalCurtidas: Number(data.totalCurtidas ?? 0) };
  },

  async listarCurtidas(postagemId: string, params: { page?: number; limit?: number } = {}) {
    return buscarPaginado("/postagens/" + postagemId + "/curtidas", "curtidas", params);
  },

  /* ---------------- Comentários ---------------- */
  async listarComentarios(
    postagemId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<Paginado<ComentarioCompleto>> {
    return buscarPaginado<ComentarioCompleto>(
      `/postagens/${postagemId}/comentarios`,
      "comentarios",
      params,
    );
  },

  async comentar(
    postagemId: string,
    comentario: string,
    comentarioPaiId?: string | null,
  ): Promise<ComentarioCompleto> {
    const { data } = await api.post<{ comentario: ComentarioCompleto }>(
      `/postagens/${postagemId}/comentarios`,
      { comentario, comentarioPaiId: comentarioPaiId ?? null },
    );
    return data.comentario;
  },

  async removerComentario(comentarioId: string): Promise<void> {
    await api.delete(`/comentarios/${comentarioId}`);
  },

  /* ---------------- Compartilhamentos ---------------- */
  async compartilhar(postagemId: string, comentario?: string) {
    const { data } = await api.post(`/compartilhamentos/postagem/${postagemId}`, {
      comentario: comentario ?? null,
    });
    return data;
  },

  async listarCompartilhamentos(postagemId: string, params: { page?: number; limit?: number } = {}) {
    return buscarPaginado(`/compartilhamentos/postagem/${postagemId}`, "compartilhamentos", params);
  },

  /** Compartilhamentos feitos por um usuário — aba "Compartilhamentos" do perfil. */
  async listarCompartilhamentosDoUsuario(
    usuarioId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<Paginado<CompartilhamentoCompleto>> {
    return buscarPaginado<CompartilhamentoCompleto>(
      `/compartilhamentos/usuario/${usuarioId}`,
      "compartilhamentos",
      params,
    );
  },

  async removerCompartilhamento(id: string): Promise<void> {
    await api.delete(`/compartilhamentos/${id}`);
  },
};

export default postagensService;
