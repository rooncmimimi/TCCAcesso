import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { clearSession, registerSessionEndedListener, setSession, type SessionEndedReason } from "../services/api/client";
import { clearTokens, getTokens } from "../storage/secureStorage";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import { AuthService } from "./AuthService";
import type { AuthStatus, AuthUser, Credenciais, LoginResposta } from "./types";

/**
 * O app não tem nenhuma tela, rota ou menu administrativo (Fase 3, item 15).
 * Uma conta `administrador` autentica normalmente no backend, mas aqui vira
 * o status `unsupported` em vez de `authenticated` — o app não inventa uma
 * versão reduzida do painel administrativo, só explica que essa conta não é
 * atendida por este aplicativo.
 */
function tipoSuportado(usuario: AuthUser): boolean {
  return usuario.tipoUsuario !== "administrador";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionEndedReason, setSessionEndedReason] = useState<SessionEndedReason | null>(null);

  // O `apiClient` avisa por aqui quando encerra uma sessão sozinho (a
  // renovação automática falhou, ou uma conta foi bloqueada em pleno uso) —
  // sem isso, o app ficaria mostrando "authenticated" com tokens que o
  // interceptor já descartou.
  useEffect(() => {
    registerSessionEndedListener((reason) => {
      setSessionEndedReason(reason);
      setUser(null);
      setStatus("unauthenticated");
    });
    return () => registerSessionEndedListener(null);
  }, []);

  // Restauração da sessão ao abrir o app: só sai de "loading" depois de
  // tentar validar um token salvo. Nunca mostra a tela de login e "puxa" o
  // usuário para dentro logo em seguida — o status certo já é decidido aqui
  // antes de qualquer tela de autenticação aparecer (Fase 3, item 13).
  useEffect(() => {
    let cancelado = false;

    async function restaurar() {
      const tokens = await getTokens();

      if (!tokens) {
        if (!cancelado) setStatus("unauthenticated");
        return;
      }

      setSession(tokens);

      try {
        const usuario = await AuthService.me();
        if (cancelado) return;

        setUser(usuario);
        setStatus(tipoSuportado(usuario) ? "authenticated" : "unsupported");
      } catch {
        if (cancelado) return;
        clearSession();
        await clearTokens();
        setStatus("unauthenticated");
      }
    }

    void restaurar();
    return () => {
      cancelado = true;
    };
  }, []);

  const login = useCallback(async (credenciais: Credenciais): Promise<LoginResposta> => {
    const resposta = await AuthService.login(credenciais);

    if ("token" in resposta) {
      setSessionEndedReason(null);
      setUser(resposta.usuario);
      setStatus(tipoSuportado(resposta.usuario) ? "authenticated" : "unsupported");
    }

    return resposta;
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const clearSessionEndedReason = useCallback(() => setSessionEndedReason(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      sessionEndedReason,
      login,
      logout,
      clearSessionEndedReason,
    }),
    [status, user, sessionEndedReason, login, logout, clearSessionEndedReason],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
