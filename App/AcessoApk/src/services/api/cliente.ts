import axios, {
  create as createAxiosInstance,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { API_URL } from "../../config/env";
import { limparTokens as clearStoredTokens, salvarTokens } from "../../armazenamento/armazenamentoSeguro";

/**
 * Cliente HTTP único do app; nenhuma tela chama `axios` ou `fetch` direto. Ele cuida do header
 * `Authorization`, detecta 401, renova a sessão (uma renovação por vez) e repete a requisição
 * original uma única vez. Por isso os serviços não tratam 401.
 *
 * O backend não usa cookies: os tokens vão no corpo JSON e no header `Authorization: Bearer`, por
 * isso não há `withCredentials`.
 */

// Endpoints públicos de autenticação: nunca recebem o Authorization
// automaticamente (o usuário ainda não tem sessão) e nunca disparam o fluxo
// de renovação quando falham; um 401 de "/auth/login" com senha errada não
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

function ehRotaPublica(url?: string): boolean {
  if (!url) return false;
  return ROTAS_PUBLICAS.some((rota) => url.includes(rota));
}

interface RequestConfigComRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export type MotivoFimSessao = "expirada" | "bloqueada" | "senha_alterada";
type OuvinteFimSessao = (motivo: MotivoFimSessao) => void;

// Tokens em memória, para o interceptor não precisar ler o SecureStore a cada requisição. O
// SecureStore continua sendo a fonte entre reinícios do app; quem mantém os dois em sincronia é o
// `AutenticacaoProvider` (restauração, login e logout) e este módulo (a cada renovação automática).
let accessToken: string | null = null;
let refreshToken: string | null = null;
let ouvinteFimSessao: OuvinteFimSessao | null = null;
let renovacaoEmAndamento: Promise<string | null> | null = null;

/** Registra o único ouvinte avisado quando a sessão termina sozinha (o `AutenticacaoProvider`). */
export function registrarOuvinteFimSessao(ouvinte: OuvinteFimSessao | null): void {
  ouvinteFimSessao = ouvinte;
}

/**
 * Dispara o mesmo encerramento de sessão do interceptor. Exportado para o cliente de Socket.IO usar
 * quando o handshake é recusado por bloqueio da conta, sem duplicar a lógica.
 */
export function notificarFimSessao(motivo: MotivoFimSessao): void {
  ouvinteFimSessao?.(motivo);
}

export function definirSessao(tokens: { accessToken: string; refreshToken: string }): void {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
}

export function obterAccessToken(): string | null {
  return accessToken;
}

export function obterRefreshToken(): string | null {
  return refreshToken;
}

export function limparSessao(): void {
  accessToken = null;
  refreshToken = null;
}

export const clienteApi: AxiosInstance = createAxiosInstance({
  baseURL: API_URL,
  timeout: 20_000,
});

clienteApi.interceptors.request.use((config) => {
  if (accessToken && !ehRotaPublica(config.url)) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

clienteApi.interceptors.response.use(
  (response) => response,
  async (erro: AxiosError) => {
    const original = erro.config as RequestConfigComRetry | undefined;
    const status = erro.response?.status;
    const dados = erro.response?.data as { detalhes?: { codigo?: string } } | undefined;

    // Conta bloqueada pela moderação: renovar o token não resolve nada;
    // encerra a sessão direto, em qualquer requisição autenticada, sem
    // tentar refresh.
    if (status === 403 && dados?.detalhes?.codigo === "CONTA_BLOQUEADA") {
      limparSessao();
      await clearStoredTokens();
      ouvinteFimSessao?.("bloqueada");
      return Promise.reject(erro);
    }

    // Senha trocada (aqui, em outro aparelho ou por recuperação): o backend recusa todo token
    // emitido antes da troca e já revogou os refresh tokens, então renovar só gastaria uma
    // requisição para falhar. Encerra na hora, com um motivo próprio — a mensagem "sessão expirou"
    // seria enganosa para quem acabou de trocar a senha em outro lugar.
    if (status === 401 && dados?.detalhes?.codigo === "SENHA_ALTERADA") {
      limparSessao();
      await clearStoredTokens();
      ouvinteFimSessao?.("senha_alterada");
      return Promise.reject(erro);
    }

    if (!original || status !== 401 || original._retry || ehRotaPublica(original.url) || !refreshToken) {
      return Promise.reject(erro);
    }

    // Marca antes de tentar renovar: se a requisição repetida tomar outro
    // 401, essa checagem acima já barra uma segunda tentativa; é isso que
    // evita o loop request → 401 → refresh → 401 → refresh → ...
    original._retry = true;

    const novoToken = await renovarSessao();

    if (!novoToken) {
      ouvinteFimSessao?.("expirada");
      return Promise.reject(erro);
    }

    original.headers.set("Authorization", `Bearer ${novoToken}`);
    return clienteApi(original);
  },
);

/**
 * Ponto único de renovação. Requisições que tomam 401 ao mesmo tempo recebem a mesma promise, em
 * vez de disparar um `/auth/refresh` cada uma (ver o teste de concorrência em
 * `__tests__/cliente.test.ts`).
 *
 * O Site usa a Web Locks API porque várias abas disputam o mesmo `localStorage`; no app há uma
 * única instância de JavaScript, então a promise compartilhada basta.
 */
export async function renovarSessao(): Promise<string | null> {
  if (renovacaoEmAndamento) return renovacaoEmAndamento;

  renovacaoEmAndamento = executarRenovacao().finally(() => {
    renovacaoEmAndamento = null;
  });

  return renovacaoEmAndamento;
}

async function executarRenovacao(): Promise<string | null> {
  if (!refreshToken) return null;

  try {
    // Chamada direta ao `axios`, fora do `clienteApi`, para não passar pelos interceptors: com um
    // refresh token inválido, a própria renovação tentaria renovar de novo, sem fim.
    const { data } = await axios.post<{ token: string; refreshToken: string }>(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 20_000 },
    );

    definirSessao({ accessToken: data.token, refreshToken: data.refreshToken });
    await salvarTokens(data.token, data.refreshToken);
    return data.token;
  } catch {
    limparSessao();
    await clearStoredTokens();
    return null;
  }
}
