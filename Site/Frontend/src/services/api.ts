import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

/** Chaves usadas para persistir os tokens JWT no navegador. */
export const ACCESS_TOKEN_KEY = "acesso:accessToken";
export const REFRESH_TOKEN_KEY = "acesso:refreshToken";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20_000,
});

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string | null, refreshToken?: string | null): void {
  if (typeof window === "undefined") return;
  if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  else window.localStorage.removeItem(ACCESS_TOKEN_KEY);

  if (refreshToken !== undefined) {
    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens(): void {
  setTokens(null, null);
}

/**
 * Notifica interessados (ex.: SessionContext) quando a sessão expira de
 * vez. `motivo`, quando informado (Fase 9: bloqueio administrativo), é uma
 * mensagem pronta para exibir ao usuário — sem motivo, o listener trata
 * como o encerramento silencioso de sempre (sessão simplesmente expirada).
 */
type SessaoExpiradaListener = (motivo?: string) => void;
const listeners = new Set<SessaoExpiradaListener>();
export function aoExpirarSessao(fn: SessaoExpiradaListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
/** Exportado para o módulo de socket (Fase 9) reaproveitar o MESMO encerramento de sessão — nunca uma segunda implementação. */
export function dispararSessaoExpirada(motivo?: string) {
  listeners.forEach((fn) => fn(motivo));
}

/** `detalhes.codigo` que o backend usa para marcar 403 de bloqueio administrativo — nunca confiar só no texto da mensagem. */
const CODIGO_CONTA_BLOQUEADA = "CONTA_BLOQUEADA";

function codigoDoErro(erro: unknown): string | undefined {
  const axiosErro = erro as AxiosError<{ detalhes?: { codigo?: string } }>;
  return axiosErro?.response?.data?.detalhes?.codigo;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/**
 * Extrai a mensagem de erro padronizada pela API do backend.
 *
 * `erros[0].msg` (validação de campo, ex.: "Informe um CPF válido.") vem
 * antes de `mensagem` de propósito: quando a validação falha, o backend
 * sempre envia `mensagem: "Erro de validação."` (genérica) junto com a
 * lista `erros` — sem essa ordem, o usuário nunca veria a mensagem
 * específica do campo que falhou.
 */
export function extrairMensagemErro(erro: unknown, padrao = "Não foi possível concluir a ação."): string {
  const axiosErro = erro as AxiosError<{ mensagem?: string; message?: string; erros?: { msg?: string }[] }>;
  const dados = axiosErro?.response?.data;
  return (
    dados?.erros?.[0]?.msg ??
    dados?.mensagem ??
    dados?.message ??
    padrao
  );
}

let refrescando: Promise<string | null> | null = null;
/** Preenchido só quando a PRÓPRIA renovação falha por bloqueio administrativo (Fase 9) — motivo específico para `dispararSessaoExpirada`, em vez do encerramento silencioso de sempre. */
let motivoUltimaFalhaRefresh: string | undefined;

async function tentarRenovarToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refrescando) {
    refrescando = axios
      .post<{ token?: string; accessToken?: string; refreshToken: string }>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
      )
      .then(({ data }) => {
        const novo = data.token ?? data.accessToken ?? null;
        setTokens(novo, data.refreshToken);
        return novo;
      })

      .catch((erroRefresh) => {
        if (codigoDoErro(erroRefresh) === CODIGO_CONTA_BLOQUEADA) {
          motivoUltimaFalhaRefresh = extrairMensagemErro(erroRefresh);
        }
        clearTokens();
        return null;
      })
      .finally(() => {
        refrescando = null;
      });
  }
  return refrescando;
}

api.interceptors.response.use(
  (response) => response,
  async (erro: AxiosError) => {
    const original = erro.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthRoute = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");

    // Fase 9: 403 de bloqueio administrativo é identificado pelo `codigo`
    // (nunca pelo texto da mensagem) — chega em qualquer chamada feita com
    // um access token que ainda é criptograficamente válido (por isso
    // nunca seria pego pelo fluxo de renovação de 401 abaixo, que é para
    // token expirado/ausente, um problema diferente). Encerra a sessão na
    // hora, sem tentar renovar (renovar não ajudaria — a conta continua
    // bloqueada) e sem esperar o chamador tratar o erro individualmente.
    if (erro.response?.status === 403 && codigoDoErro(erro) === CODIGO_CONTA_BLOQUEADA && !isAuthRoute) {
      clearTokens();
      dispararSessaoExpirada(extrairMensagemErro(erro));
      return Promise.reject(erro);
    }

    if (erro.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      const novoToken = await tentarRenovarToken();
      if (novoToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${novoToken}`;
        return api(original);
      }
      const motivo = motivoUltimaFalhaRefresh;
      motivoUltimaFalhaRefresh = undefined;
      clearTokens();
      dispararSessaoExpirada(motivo);
    }
    return Promise.reject(erro);
  },
);

export default api;
