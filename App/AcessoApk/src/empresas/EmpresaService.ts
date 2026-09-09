import { apiClient } from "../services/api/client";
import type { AtualizarEmpresaDados, EmpresaResposta, EmpresaResumo } from "./types";

/**
 * Única camada que conhece os endpoints reais de empresa
 * (`Site/Backend/src/routes/empresaRoutes.js`, confirmado por auditoria).
 * Nenhum método trata 401 por conta própria (interceptor do `apiClient` já
 * cuida disso).
 */
export const EmpresaService = {
  /** `GET /empresas/:id` — auth opcional no backend, sempre autenticado aqui (o app não tem área pública). */
  async obterPorId(id: string): Promise<EmpresaResumo> {
    const { data } = await apiClient.get<EmpresaResposta>(`/empresas/${id}`);
    return data.empresa;
  },

  /** `GET /empresas/usuario/:usuarioId` — resolve o perfil de empresa a partir do `usuarioId` (o mesmo id que aparece em `postagem.usuario`/listas de seguidores). */
  async obterPorUsuario(usuarioId: string): Promise<EmpresaResumo> {
    const { data } = await apiClient.get<EmpresaResposta>(`/empresas/usuario/${usuarioId}`);
    return data.empresa;
  },

  /** `GET /empresas/me` — perfil de empresa do USUÁRIO AUTENTICADO (Fase 18). 404 se a conta não tiver registro de empresa (nunca deveria acontecer para `tipoUsuario:"empresa"` — cadastro cria os dois juntos — mas o backend não presume isso). */
  async meuPerfil(): Promise<EmpresaResumo> {
    const { data } = await apiClient.get<EmpresaResposta>("/empresas/me");
    return data.empresa;
  },

  /** `PUT /empresas/:id` — exige empresa aprovada (`garantirEmpresaAprovada` no backend); dona ou administrador. */
  async atualizar(id: string, dados: AtualizarEmpresaDados): Promise<EmpresaResumo> {
    const { data } = await apiClient.put<EmpresaResposta>(`/empresas/${id}`, dados);
    return data.empresa;
  },
};
