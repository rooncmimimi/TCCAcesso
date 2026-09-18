import { clienteApi } from "../services/api/cliente";
import type {
  BloquearResposta,
  CriarDenunciaDados,
  CriarDenunciaResposta,
  Denuncia,
  ListaBloqueadosResposta,
  ListarBloqueadosParametros,
} from "./types";

/** Bloqueio de usuários e envio de denúncias. */
export const ModeracaoService = {
  /** `GET /usuarios/bloqueados`. */
  async listarBloqueados(parametros: ListarBloqueadosParametros = {}): Promise<ListaBloqueadosResposta> {
    const { data } = await clienteApi.get<ListaBloqueadosResposta>("/usuarios/bloqueados", { params: parametros });
    return data;
  },

  /** `POST /usuarios/:usuarioId/bloquear`: idempotente (`findOrCreate` no backend); já desfaz seguir/ser seguido nos dois sentidos. */
  async bloquear(usuarioId: string): Promise<boolean> {
    const { data } = await clienteApi.post<BloquearResposta>(`/usuarios/${usuarioId}/bloquear`);
    return data.bloqueado;
  },

  /**
   * `DELETE /usuarios/:usuarioId/bloquear`: remove só o meu bloqueio sobre esse usuário (se a outra
   * pessoa também me bloqueou, o bloqueio dela continua).
   */
  async desbloquear(usuarioId: string): Promise<boolean> {
    const { data } = await clienteApi.delete<BloquearResposta>(`/usuarios/${usuarioId}/bloquear`);
    return data.bloqueado;
  },

  /** `POST /denuncias`: 409 se já existe uma denúncia sua para a mesma entidade ainda em análise (tratado pelo chamador via `extrairMensagemErro`). */
  async denunciar(dados: CriarDenunciaDados): Promise<Denuncia> {
    const { data } = await clienteApi.post<CriarDenunciaResposta>("/denuncias", dados);
    return data.denuncia;
  },
};
