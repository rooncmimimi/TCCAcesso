import clienteApi from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { PreferenciaMensagens, UsuarioBloqueado } from "@/types";

/** Bloqueio de usuários e privacidade de perfil: espelha `/usuarios/*` no backend. */
export const bloqueioService = {
  async listarBloqueados(params: { page?: number; limit?: number } = {}): Promise<Paginado<UsuarioBloqueado>> {
    return buscarPaginado<UsuarioBloqueado>("/usuarios/bloqueados", "bloqueados", params);
  },

  async bloquear(usuarioId: string): Promise<void> {
    await clienteApi.post(`/usuarios/${usuarioId}/bloquear`);
  },

  async desbloquear(usuarioId: string): Promise<void> {
    await clienteApi.delete(`/usuarios/${usuarioId}/bloquear`);
  },

  async atualizarPrivacidade(perfilPublico: boolean): Promise<{ perfilPublico: boolean }> {
    const { data } = await clienteApi.put<{ perfilPublico: boolean }>("/usuarios/privacidade", { perfilPublico });
    return data;
  },

  async atualizarPreferenciaMensagens(
    preferenciaMensagens: PreferenciaMensagens,
  ): Promise<{ preferenciaMensagens: PreferenciaMensagens }> {
    const { data } = await clienteApi.put<{ preferenciaMensagens: PreferenciaMensagens }>(
      "/usuarios/privacidade/mensagens",
      { preferenciaMensagens },
    );
    return data;
  },
};

export default bloqueioService;
