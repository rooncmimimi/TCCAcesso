import api from "./api";

/** Envelope padrão de listagem paginada do backend Express. */
export interface Paginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ParamsPaginacao {
  page?: number;
  limit?: number;
  [chave: string]: unknown;
}

/**
 * Faz um GET em uma rota paginada e normaliza o envelope
 * `{ total, pagina, limite, totalPaginas, [chave]: [] }`.
 */
export async function buscarPaginado<T>(
  url: string,
  chave: string,
  params: ParamsPaginacao = {},
): Promise<Paginado<T>> {
  const { data } = await api.get<Record<string, unknown>>(url, { params });

  const lista = (data?.[chave] ?? data?.dados ?? []) as T[];

  return {
    dados: Array.isArray(lista) ? lista : [],
    total: Number(data?.total ?? lista?.length ?? 0),
    pagina: Number(data?.pagina ?? params.page ?? 1),
    limite: Number(data?.limite ?? params.limit ?? 10),
    totalPaginas: Number(data?.totalPaginas ?? 1),
  };
}

/** GET simples que devolve apenas uma chave do envelope. */
export async function buscarChave<T>(url: string, chave: string, params?: unknown): Promise<T> {
  const { data } = await api.get<Record<string, T>>(url, { params: params as never });
  return data?.[chave] as T;
}

export default api;
