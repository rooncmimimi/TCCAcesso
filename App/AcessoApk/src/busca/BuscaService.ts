import { apiClient } from "../services/api/client";
import type {
  BuscaEmpresasResposta,
  BuscaPostagensResposta,
  BuscaResumoResposta,
  BuscaUsuariosResposta,
  BuscaVagasResposta,
  BuscarParametros,
} from "./types";

/**
 * Única camada que conhece o endpoint real de busca global
 * (`Site/Backend/src/routes/buscaRoutes.js`, confirmado por auditoria) —
 * `GET /busca`, auth obrigatória. Todo path/parâmetro/formato de resposta
 * aqui é literal ao que o backend expõe hoje. Nenhum método trata 401 por
 * conta própria: o interceptor de `apiClient` já cuida disso pra todo o
 * app (mesma regra de `VagasService`/`SeguidorService`).
 *
 * `termo` nunca é validado aqui (mínimo de 2 caracteres) — quem decide
 * quando chamar é a tela (`SearchScreen.tsx`), pra nunca disparar uma
 * requisição que o backend recusaria com 400.
 */
export const BuscaService = {
  /** `GET /busca?tipo=tudo` — resumo agrupado das 4 categorias (até 5 itens cada), uma chamada só. */
  async buscarResumo(termo: string): Promise<BuscaResumoResposta> {
    const { data } = await apiClient.get<BuscaResumoResposta>("/busca", { params: { q: termo, tipo: "tudo" } });
    return data;
  },

  /** `GET /busca?tipo=usuarios` — paginação clássica real (diferente do resumo). */
  async buscarUsuarios(termo: string, parametros: BuscarParametros = {}): Promise<BuscaUsuariosResposta> {
    const { data } = await apiClient.get<BuscaUsuariosResposta>("/busca", {
      params: { q: termo, tipo: "usuarios", ...parametros },
    });
    return data;
  },

  /** `GET /busca?tipo=empresas`. */
  async buscarEmpresas(termo: string, parametros: BuscarParametros = {}): Promise<BuscaEmpresasResposta> {
    const { data } = await apiClient.get<BuscaEmpresasResposta>("/busca", {
      params: { q: termo, tipo: "empresas", ...parametros },
    });
    return data;
  },

  /** `GET /busca?tipo=vagas`. */
  async buscarVagas(termo: string, parametros: BuscarParametros = {}): Promise<BuscaVagasResposta> {
    const { data } = await apiClient.get<BuscaVagasResposta>("/busca", {
      params: { q: termo, tipo: "vagas", ...parametros },
    });
    return data;
  },

  /** `GET /busca?tipo=postagens`. */
  async buscarPostagens(termo: string, parametros: BuscarParametros = {}): Promise<BuscaPostagensResposta> {
    const { data } = await apiClient.get<BuscaPostagensResposta>("/busca", {
      params: { q: termo, tipo: "postagens", ...parametros },
    });
    return data;
  },
};
