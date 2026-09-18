import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

/** Chaves usadas para persistir os tokens JWT no navegador. */
export const CHAVE_ACCESS_TOKEN = "acesso:accessToken";
export const CHAVE_REFRESH_TOKEN = "acesso:refreshToken";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export const clienteApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20_000,
});

export function obterAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CHAVE_ACCESS_TOKEN);
}

export function obterRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CHAVE_REFRESH_TOKEN);
}

export function definirTokens(accessToken: string | null, refreshToken?: string | null): void {
  if (typeof window === "undefined") return;
  if (accessToken) window.localStorage.setItem(CHAVE_ACCESS_TOKEN, accessToken);
  else window.localStorage.removeItem(CHAVE_ACCESS_TOKEN);

  if (refreshToken !== undefined) {
    if (refreshToken) window.localStorage.setItem(CHAVE_REFRESH_TOKEN, refreshToken);
    else window.localStorage.removeItem(CHAVE_REFRESH_TOKEN);
  }
}

export function limparTokens(): void {
  definirTokens(null, null);
}

/**
 * Avisa os interessados (como o `SessaoProvider`) quando a sessão termina de vez. `motivo`, quando
 * vem (conta bloqueada pela moderação), é uma mensagem pronta para exibir; sem ele, é o
 * encerramento comum por sessão expirada.
 */
type SessaoExpiradaListener = (motivo?: string) => void;
const listeners = new Set<SessaoExpiradaListener>();
export function aoExpirarSessao(fn: SessaoExpiradaListener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
/** Exportado para o `socket.ts` usar o mesmo encerramento de sessão, sem uma segunda implementação. */
export function dispararSessaoExpirada(motivo?: string) {
  listeners.forEach((fn) => fn(motivo));
}

/** `detalhes.codigo` que o backend usa para marcar 403 de bloqueio administrativo; nunca confiar só no texto da mensagem. */
const CODIGO_CONTA_BLOQUEADA = "CONTA_BLOQUEADA";

function codigoDoErro(erro: unknown): string | undefined {
  const axiosErro = erro as AxiosError<{ detalhes?: { codigo?: string } }>;
  return axiosErro?.response?.data?.detalhes?.codigo;
}

clienteApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = obterAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/**
 * Extrai a mensagem de erro da API. A mensagem do primeiro erro de validação vem antes de
 * `mensagem`, porque nesse caso a `mensagem` geral é sempre "Erro de validação.". O backend usa o
 * mesmo formato em toda resposta de erro: `{ mensagem, erros: [{ campo, mensagem }] }`.
 */
export function extrairMensagemErro(erro: unknown, padrao = "Não foi possível concluir a ação."): string {
  const axiosErro = erro as AxiosError<{ mensagem?: string; message?: string; erros?: { campo?: string; mensagem?: string }[] }>;
  const dados = axiosErro?.response?.data;
  return (
    dados?.erros?.[0]?.mensagem ??
    dados?.mensagem ??
    dados?.message ??
    padrao
  );
}

let refrescando: Promise<string | null> | null = null;
/**
 * Preenchido só quando a própria renovação falha por bloqueio da conta: vira o motivo passado a
 * `dispararSessaoExpirada`.
 */
let motivoUltimaFalhaRefresh: string | undefined;

/**
 * Chave do lock entre abas (Web Locks API), que serializa a renovação do token em todas as abas da
 * mesma origem. `refrescando` evita chamadas repetidas a `/auth/refresh` dentro de uma aba, mas
 * cada aba tem o seu, e duas abas renovando juntas usariam o mesmo refresh token.
 *
 * O backend (`RefreshTokenService.rotacionar`) tolera o reuso por 20 segundos, pensando num retry
 * de rede do mesmo cliente. Duas abas dentro dessa janela criavam sessões extras, e uma delas,
 * reapresentada depois dos 20 segundos, era tratada como roubo e derrubava a família inteira de
 * tokens. O lock evita a corrida sem mudar nada no backend.
 */
const CHAVE_LOCK_REFRESH = "acesso:refresh-lock";

async function chamarRefresh(refreshToken: string): Promise<string | null> {
  try {
    // `timeout` explícito, igual ao da instância `api`: com o lock entre abas, uma renovação que
    // nunca termina travaria todas as abas que esperam a mesma seção crítica.
    const { data } = await axios.post<{ token?: string; accessToken?: string; refreshToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 20_000 },
    );
    const novo = data.token ?? data.accessToken ?? null;
    definirTokens(novo, data.refreshToken);
    return novo;
  } catch (erroRefresh) {
    if (codigoDoErro(erroRefresh) === CODIGO_CONTA_BLOQUEADA) {
      motivoUltimaFalhaRefresh = extrairMensagemErro(erroRefresh);
    }
    limparTokens();
    return null;
  }
}

/**
 * Renova já dentro da seção crítica. Antes da chamada, relê o refresh token do localStorage: se
 * mudou desde que esta aba decidiu renovar, outra aba já rotacionou, e basta usar o access token
 * que ela guardou.
 */
async function renovarNaSecaoCritica(refreshTokenDeQuandoComecou: string): Promise<string | null> {
  const tokenAtual = obterRefreshToken();
  if (!tokenAtual) return null;
  if (tokenAtual !== refreshTokenDeQuandoComecou) {
    return obterAccessToken();
  }
  return chamarRefresh(tokenAtual);
}

async function renovarComLockSePossivel(refreshToken: string): Promise<string | null> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  // Sem Web Locks API (navegadores antigos), a proteção fica só dentro desta aba.
  if (!locks) return renovarNaSecaoCritica(refreshToken);
  return locks.request(CHAVE_LOCK_REFRESH, () => renovarNaSecaoCritica(refreshToken));
}

async function tentarRenovarToken(): Promise<string | null> {
  const refreshToken = obterRefreshToken();
  if (!refreshToken) return null;

  if (!refrescando) {
    refrescando = renovarComLockSePossivel(refreshToken).finally(() => {
      refrescando = null;
    });
  }
  return refrescando;
}

clienteApi.interceptors.response.use(
  (response) => response,
  async (erro: AxiosError) => {
    const original = erro.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const ehRotaAutenticacao = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");

    // 403 de conta bloqueada, identificado pelo `codigo` e nunca pelo texto. Pode chegar com um
    // access token ainda válido, então não passa pelo fluxo de 401 abaixo. A sessão é encerrada na
    // hora, sem tentar renovar (a conta continua bloqueada) e sem depender de cada chamador tratar
    // o erro.
    if (erro.response?.status === 403 && codigoDoErro(erro) === CODIGO_CONTA_BLOQUEADA && !ehRotaAutenticacao) {
      limparTokens();
      dispararSessaoExpirada(extrairMensagemErro(erro));
      return Promise.reject(erro);
    }

    if (erro.response?.status === 401 && original && !original._retry && !ehRotaAutenticacao) {
      original._retry = true;
      const novoToken = await tentarRenovarToken();
      if (novoToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${novoToken}`;
        return clienteApi(original);
      }
      const motivo = motivoUltimaFalhaRefresh;
      motivoUltimaFalhaRefresh = undefined;
      limparTokens();
      dispararSessaoExpirada(motivo);
    }
    return Promise.reject(erro);
  },
);

export default clienteApi;
