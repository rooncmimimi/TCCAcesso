import { clienteApi } from "../services/api/cliente";
import type { AtualizarEmpresaDados, EmpresaResposta, EmpresaResumo } from "./types";

/** Perfil de empresa: leitura pública e edição dos dados da própria empresa. */
export const EmpresaService = {
  /** `GET /empresas/:id`: auth opcional no backend, sempre autenticado aqui (o app não tem área pública). */
  async obterPorId(id: string): Promise<EmpresaResumo> {
    const { data } = await clienteApi.get<EmpresaResposta>(`/empresas/${id}`);
    return data.empresa;
  },

  /** `GET /empresas/usuario/:usuarioId`: resolve o perfil de empresa a partir do `usuarioId` (o mesmo id que aparece em `postagem.usuario`/listas de seguidores). */
  async obterPorUsuario(usuarioId: string): Promise<EmpresaResumo> {
    const { data } = await clienteApi.get<EmpresaResposta>(`/empresas/usuario/${usuarioId}`);
    return data.empresa;
  },

  /**
   * `GET /empresas/me`: empresa da conta logada. Responde 404 se a conta não tiver empresa, o que
   * não deveria acontecer, porque o cadastro cria as duas juntas.
   */
  async meuPerfil(): Promise<EmpresaResumo> {
    const { data } = await clienteApi.get<EmpresaResposta>("/empresas/me");
    return data.empresa;
  },

  /** `PUT /empresas/:id`: exige empresa aprovada (`garantirEmpresaAprovada` no backend); dona ou administrador. */
  async atualizar(id: string, dados: AtualizarEmpresaDados): Promise<EmpresaResumo> {
    const { data } = await clienteApi.put<EmpresaResposta>(`/empresas/${id}`, dados);
    return data.empresa;
  },
};
