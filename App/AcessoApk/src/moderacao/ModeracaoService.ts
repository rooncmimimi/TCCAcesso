import { apiClient } from "../services/api/client";
import type {
  BloquearResposta,
  CriarDenunciaDados,
  CriarDenunciaResposta,
  Denuncia,
  ListaBloqueadosResposta,
  ListarBloqueadosParametros,
} from "./types";

/**
 * Única camada que conhece os endpoints reais de bloqueio
 * (`Site/Backend/src/routes/usuarioRoutes.js`) e denúncia
 * (`Site/Backend/src/routes/denunciaRoutes.js`), confirmado por auditoria.
 * Nenhum método trata 401 por conta própria (interceptor do `apiClient` já
 * cuida disso).
 */
export const ModeracaoService = {
  /** `GET /usuarios/bloqueados`. */
  async listarBloqueados(parametros: ListarBloqueadosParametros = {}): Promise<ListaBloqueadosResposta> {
    const { data } = await apiClient.get<ListaBloqueadosResposta>("/usuarios/bloqueados", { params: parametros });
    return data;
  },

  /** `POST /usuarios/:usuarioId/bloquear` — idempotente (`findOrCreate` no backend); já desfaz seguir/ser seguido nos dois sentidos. */
  async bloquear(usuarioId: string): Promise<boolean> {
    const { data } = await apiClient.post<BloquearResposta>(`/usuarios/${usuarioId}/bloquear`);
    return data.bloqueado;
  },

  /** `DELETE /usuarios/:usuarioId/bloquear` — remove só o MEU bloqueio sobre esse usuário (se ele me bloqueou também, isso não desfaz o bloqueio dele). */
  async desbloquear(usuarioId: string): Promise<boolean> {
    const { data } = await apiClient.delete<BloquearResposta>(`/usuarios/${usuarioId}/bloquear`);
    return data.bloqueado;
  },

  /** `POST /denuncias` — 409 se já existe uma denúncia sua para a mesma entidade ainda em análise (tratado pelo chamador via `getFriendlyErrorMessage`). */
  async denunciar(dados: CriarDenunciaDados): Promise<Denuncia> {
    const { data } = await apiClient.post<CriarDenunciaResposta>("/denuncias", dados);
    return data.denuncia;
  },
};
