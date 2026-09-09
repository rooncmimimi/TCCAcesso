import axios, {
  create as createAxiosInstance,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { API_URL } from "../../config/env";
import { clearTokens as clearStoredTokens, saveTokens } from "../../storage/secureStorage";

/**
 * Cliente HTTP único do app — nenhuma tela deve chamar `axios`/`fetch`
 * diretamente. Ele resolve sozinho: header `Authorization`, detecção de 401,
 * renovação (com proteção contra chamadas concorrentes) e uma única
 * repetição da requisição original depois de renovar.
 *
 * O backend (Site/Backend) não usa cookies em NENHUM endpoint de
 * autenticação — confirmado por auditoria (zero `Set-Cookie`/`cookie-parser`
 * em todo `src/`). Todo token trafega no corpo JSON e no header
 * `Authorization: Bearer`. Por isso não existe `withCredentials` aqui: é um
 * comportamento de cookie de navegador que este cliente não usa e que não
 * existe em React Native.
 */

// Endpoints públicos de autenticação: nunca recebem o Authorization
// automaticamente (o usuário ainda não tem sessão) e nunca disparam o fluxo
// de renovação quando falham — um 401 de "/auth/login" com senha errada não
// é uma "sessão expirada", é uma credencial inválida.
const ROTAS_PUBLICAS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/register/candidato",
  "/auth/register/empresa",
  "/auth/senha/esqueci",
  "/auth/senha/redefinir",
  "/auth/cadastro/confirmar-email",
  "/auth/cadastro/reenviar-confirmacao",
];

function isRotaPublica(url?: string): boolean {
  if (!url) return false;
  return ROTAS_PUBLICAS.some((rota) => url.includes(rota));
}

interface RequestConfigComRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export type SessionEndedReason = "expired" | "blocked";
type SessionEndedListener = (reason: SessionEndedReason) => void;

// --- Estado de sessão em memória --------------------------------------
// Fonte síncrona e rápida para o interceptor não precisar de uma leitura
// assíncrona do SecureStore a cada requisição. O SecureStore continua sendo
// a fonte de verdade entre reinícios do app: quem sincroniza os dois é o
// AuthProvider (na restauração e no login/logout) e este próprio módulo
// (a cada renovação automática disparada por um 401).
let accessToken: string | null = null;
let refreshToken: string | null = null;
let sessionEndedListener: SessionEndedListener | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function registerSessionEndedListener(listener: SessionEndedListener | null): void {
  sessionEndedListener = listener;
}

/**
 * Dispara o mesmo encerramento de sessão que o interceptor abaixo já dispara
 * sozinho num 401/403 — exportado para o cliente de Socket.IO (Fase 17)
 * poder reaproveitar exatamente o mesmo mecanismo quando o handshake é
 * rejeitado por bloqueio administrativo, em vez de duplicar a lógica de
 * "encerrar sessão" numa segunda implementação.
 */
export function notifySessionEnded(reason: SessionEndedReason): void {
  sessionEndedListener?.(reason);
}

export function setSession(tokens: { accessToken: string; refreshToken: string }): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function clearSession(): void {
  accessToken = null;
  refreshToken = null;
}

export const apiClient: AxiosInstance = createAxiosInstance({
  baseURL: API_URL,
  timeout: 20_000,
});

apiClient.interceptors.request.use((config) => {
  if (accessToken && !isRotaPublica(config.url)) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RequestConfigComRetry | undefined;
    const status = error.response?.status;
    const dados = error.response?.data as { detalhes?: { codigo?: string } } | undefined;

    // Conta bloqueada pela moderação: renovar o token não resolve nada —
    // encerra a sessão direto, em qualquer requisição autenticada, sem
    // tentar refresh.
    if (status === 403 && dados?.detalhes?.codigo === "CONTA_BLOQUEADA") {
      clearSession();
      await clearStoredTokens();
      sessionEndedListener?.("blocked");
      return Promise.reject(error);
    }

    if (!original || status !== 401 || original._retry || isRotaPublica(original.url) || !refreshToken) {
      return Promise.reject(error);
    }

    // Marca ANTES de tentar renovar: se a requisição repetida tomar outro
    // 401, essa checagem acima já barra uma segunda tentativa — é isso que
    // evita o loop request → 401 → refresh → 401 → refresh → ...
    original._retry = true;

    const novoToken = await refreshSession();

    if (!novoToken) {
      sessionEndedListener?.("expired");
      return Promise.reject(error);
    }

    original.headers.set("Authorization", `Bearer ${novoToken}`);
    return apiClient(original);
  },
);

/**
 * Ponto único de renovação. Se já existe uma renovação em andamento, TODAS
 * as chamadas concorrentes recebem a MESMA promise em vez de disparar um
 * `/auth/refresh` cada uma — evita N chamadas de refresh quando N
 * requisições tomam 401 ao mesmo tempo (ver teste de concorrência em
 * `__tests__/client.test.ts`).
 *
 * Não existe aqui nenhum equivalente à Web Locks API que o site usa: aquele
 * mecanismo coordena ABAS DIFERENTES do mesmo navegador competindo pelo
 * mesmo `localStorage` — um conceito que não existe em React Native (o app
 * roda como uma única instância de JS, não várias abas). Uma promise
 * compartilhada em memória já cobre o cenário real do app: várias
 * requisições da MESMA instância tomando 401 ao mesmo tempo.
 */
export async function refreshSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = executarRenovacao().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function executarRenovacao(): Promise<string | null> {
  if (!refreshToken) return null;

  try {
    // Chamada crua (não usa `apiClient`) para nunca passar pelos
    // interceptors acima — senão um refresh token inválido faria o próprio
    // refresh tentar... renovar de novo, recursivamente.
    // `axios.post` (não uma função nomeada própria) porque os tipos do
    // axios só expõem `post` como método do objeto default, não como
    // export nomeado independente — só `create`/`isAxiosError`/`AxiosError`
    // têm essa forma.
    const { data } = await axios.post<{ token: string; refreshToken: string }>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 20_000 },
    );

    setSession({ accessToken: data.token, refreshToken: data.refreshToken });
    await saveTokens(data.token, data.refreshToken);
    return data.token;
  } catch {
    clearSession();
    await clearStoredTokens();
    return null;
  }
}
