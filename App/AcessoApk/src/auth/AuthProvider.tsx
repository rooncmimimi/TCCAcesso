import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { clearSession, registerSessionEndedListener, setSession, type SessionEndedReason } from "../services/api/client";
import { desconectarSocket } from "../services/socket/socketClient";
import { clearTokens, getTokens } from "../storage/secureStorage";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import { AuthService } from "./AuthService";
import type {
  AuthStatus,
  AuthUser,
  CadastroCandidatoDados,
  CadastroEmpresaDados,
  CadastroResposta,
  Credenciais,
  LoginResposta,
} from "./types";

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
      // Fase 17: uma sessão encerrada (renovação falhou, ou bloqueio
      // administrativo — inclusive quando é o PRÓPRIO handshake do socket
      // que descobre o bloqueio) nunca deve deixar uma conexão de tempo
      // real autenticada viva.
      desconectarSocket();
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

  /** Só autentica de fato quando a resposta já vem com sessão — mesma checagem de `login`, reaproveitada pelas duas variantes de cadastro (Fase 11). */
  const aplicarSessaoSeHouver = useCallback((resposta: LoginResposta | CadastroResposta) => {
    if ("token" in resposta) {
      setSessionEndedReason(null);
      setUser(resposta.usuario);
      setStatus(tipoSuportado(resposta.usuario) ? "authenticated" : "unsupported");
    }
  }, []);

  const login = useCallback(
    async (credenciais: Credenciais): Promise<LoginResposta> => {
      const resposta = await AuthService.login(credenciais);
      aplicarSessaoSeHouver(resposta);
      return resposta;
    },
    [aplicarSessaoSeHouver],
  );

  const registerCandidato = useCallback(
    async (dados: CadastroCandidatoDados): Promise<CadastroResposta> => {
      const resposta = await AuthService.registerCandidato(dados);
      aplicarSessaoSeHouver(resposta);
      return resposta;
    },
    [aplicarSessaoSeHouver],
  );

  const registerEmpresa = useCallback(
    async (dados: CadastroEmpresaDados): Promise<CadastroResposta> => {
      const resposta = await AuthService.registerEmpresa(dados);
      aplicarSessaoSeHouver(resposta);
      return resposta;
    },
    [aplicarSessaoSeHouver],
  );

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
    setStatus("unauthenticated");
    desconectarSocket();
  }, []);

  const clearSessionEndedReason = useCallback(() => setSessionEndedReason(null), []);

  const refreshUser = useCallback(async () => {
    try {
      const usuario = await AuthService.me();
      setUser(usuario);
      setStatus(tipoSuportado(usuario) ? "authenticated" : "unsupported");
    } catch {
      // Falha silenciosa — ver comentário em `AuthContext.ts`.
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      sessionEndedReason,
      login,
      registerCandidato,
      registerEmpresa,
      logout,
      clearSessionEndedReason,
      refreshUser,
    }),
    [
      status,
      user,
      sessionEndedReason,
      login,
      registerCandidato,
      registerEmpresa,
      logout,
      clearSessionEndedReason,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
