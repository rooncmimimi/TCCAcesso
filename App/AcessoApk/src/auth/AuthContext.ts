import { createContext } from "react";

import type { SessionEndedReason } from "../services/api/client";
import type { AuthStatus, AuthUser, Credenciais, LoginResposta } from "./types";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** `true` só durante a restauração inicial da sessão salva — não durante um login em andamento (isso é local de cada tela). */
  isLoading: boolean;
  /** Motivo pelo qual uma sessão anterior foi encerrada sozinha (renovação falhou, ou conta bloqueada) — para a tela de login mostrar uma vez. */
  sessionEndedReason: SessionEndedReason | null;
  login: (credenciais: Credenciais) => Promise<LoginResposta>;
  logout: () => Promise<void>;
  clearSessionEndedReason: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
