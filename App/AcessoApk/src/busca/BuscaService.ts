import { clienteApi } from "../services/api/cliente";
import type {
  BuscaEmpresasResposta,
  BuscaPostagensResposta,
  BuscaResumoResposta,
  BuscaUsuariosResposta,
  BuscaVagasResposta,
  BuscarParametros,
} from "./types";

/**
 * Chamadas da busca global (`GET /busca`). O termo não é validado aqui: a `BuscaScreen` só chama o
 * serviço com pelo menos 2 caracteres, o mínimo aceito pelo backend.
 */
export const BuscaService = {
  /** `GET /busca?tipo=tudo`: resumo agrupado das 4 categorias (até 5 itens cada), uma chamada só. */
  async buscarResumo(termo: string): Promise<BuscaResumoResposta> {
    const { data } = await clienteApi.get<BuscaResumoResposta>("/busca", { params: { q: termo, tipo: "tudo" } });
    return data;
  },

  /** `GET /busca?tipo=usuarios`: paginação clássica real (diferente do resumo). */
  async buscarUsuarios(termo: string, parametros: BuscarParametros = {}): Promise<BuscaUsuariosResposta> {
    const { data } = await clienteApi.get<BuscaUsuariosResposta>("/busca", {
      params: { q: termo, tipo: "usuarios", ...parametros },
    });
    return data;
  },

  /** `GET /busca?tipo=empresas`. */
  async buscarEmpresas(termo: string, parametros: BuscarParametros = {}): Promise<BuscaEmpresasResposta> {
    const { data } = await clienteApi.get<BuscaEmpresasResposta>("/busca", {
      params: { q: termo, tipo: "empresas", ...parametros },
    });
    return data;
  },

  /** `GET /busca?tipo=vagas`. */
  async buscarVagas(termo: string, parametros: BuscarParametros = {}): Promise<BuscaVagasResposta> {
    const { data } = await clienteApi.get<BuscaVagasResposta>("/busca", {
      params: { q: termo, tipo: "vagas", ...parametros },
    });
    return data;
  },

  /** `GET /busca?tipo=postagens`. */
  async buscarPostagens(termo: string, parametros: BuscarParametros = {}): Promise<BuscaPostagensResposta> {
    const { data } = await clienteApi.get<BuscaPostagensResposta>("/busca", {
      params: { q: termo, tipo: "postagens", ...parametros },
    });
    return data;
  },
};
