import { apiClient, clearSession, getRefreshToken, refreshSession, setSession } from "../services/api/client";
import { clearTokens, saveTokens } from "../storage/secureStorage";
import type { AuthUser, Credenciais, LoginResposta } from "./types";

/**
 * Única camada que conhece os endpoints reais de autenticação
 * (`Site/Backend/src/routes/authRoutes.js`, confirmado por auditoria). Todo
 * path, payload e formato de resposta aqui é literal ao que o backend
 * realmente expõe hoje — nada foi presumido.
 */
export const AuthService = {
  /** `POST /auth/login`. Em sucesso, já grava a sessão (memória + disco). */
  async login(credenciais: Credenciais): Promise<LoginResposta> {
    const { data } = await apiClient.post<LoginResposta>("/auth/login", credenciais);

    if ("token" in data) {
      setSession({ accessToken: data.token, refreshToken: data.refreshToken });
      await saveTokens(data.token, data.refreshToken);
    }

    return data;
  },

  /** `GET /auth/me` — usuário autenticado atual. Exige Authorization (o `apiClient` cuida disso). */
  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<{ sucesso: true; usuario: AuthUser }>("/auth/me");
    return data.usuario;
  },

  /**
   * `POST /auth/logout`. Best-effort: se o servidor estiver fora do ar, o
   * usuário não deve ficar preso à sessão local por causa disso (decisão do
   * item 24 da Fase 3, documentada no relatório final) — por isso esta
   * função NUNCA rejeita: a sessão local é sempre limpa, e uma falha ao
   * avisar o backend é silenciosamente ignorada (não há nada que o chamador
   * possa fazer a respeito).
   */
  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      try {
        await apiClient.post("/auth/logout", { refreshToken });
      } catch {
        // Best-effort — ver comentário acima.
      }
    }

    clearSession();
    await clearTokens();
  },

  /**
   * Delega para o mesmo mecanismo de renovação usado pelo interceptor do
   * `apiClient` (protegido contra chamadas concorrentes — ver
   * `services/api/client.ts`). Exposto aqui só para o caso de uma tela
   * futura precisar renovar explicitamente; nenhuma tela desta fase chama
   * isto diretamente.
   */
  async refresh(): Promise<string | null> {
    return refreshSession();
  },

  /** `POST /auth/senha/esqueci`. Resposta do backend é sempre genérica (não revela se a conta existe). */
  async esqueciSenha(email: string): Promise<{ mensagem?: string }> {
    const { data } = await apiClient.post<{ sucesso: boolean; mensagem?: string }>("/auth/senha/esqueci", { email });
    return data;
  },

  /** `POST /auth/senha/redefinir`. */
  async redefinirSenha(payload: { email: string; codigo: string; novaSenha: string }): Promise<void> {
    await apiClient.post("/auth/senha/redefinir", payload);
  },

  /** `POST /auth/cadastro/reenviar-confirmacao`. */
  async reenviarConfirmacao(email: string): Promise<void> {
    await apiClient.post("/auth/cadastro/reenviar-confirmacao", { email });
  },
};
