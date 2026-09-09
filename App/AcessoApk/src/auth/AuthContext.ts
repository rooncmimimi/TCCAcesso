import { createContext } from "react";

import type { SessionEndedReason } from "../services/api/client";
import type {
  AuthStatus,
  AuthUser,
  CadastroCandidatoDados,
  CadastroEmpresaDados,
  CadastroResposta,
  Credenciais,
  LoginResposta,
} from "./types";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** `true` só durante a restauração inicial da sessão salva — não durante um login em andamento (isso é local de cada tela). */
  isLoading: boolean;
  /** Motivo pelo qual uma sessão anterior foi encerrada sozinha (renovação falhou, ou conta bloqueada) — para a tela de login mostrar uma vez. */
  sessionEndedReason: SessionEndedReason | null;
  login: (credenciais: Credenciais) => Promise<LoginResposta>;
  /** Fase 11. Só atualiza `status`/`user` quando a resposta já vem com sessão (provedor de e-mail indisponível) — o caso comum (`pendenteVerificacaoEmail`) não autentica ninguém ainda. */
  registerCandidato: (dados: CadastroCandidatoDados) => Promise<CadastroResposta>;
  registerEmpresa: (dados: CadastroEmpresaDados) => Promise<CadastroResposta>;
  logout: () => Promise<void>;
  clearSessionEndedReason: () => void;
  /**
   * Fase 15 — busca `/auth/me` de novo e atualiza `user` no contexto
   * global. Existe porque telas que mudam dados do próprio usuário (nome
   * em `MyProfileScreen`, e-mail em `SettingsScreen`) editam só o que a
   * PRÓPRIA tela mostra — sem isto, `HomeScreen`/`ProfileMenuScreen`
   * continuariam mostrando o nome/e-mail antigo até o app reiniciar. Falha
   * silenciosa (mantém o usuário atual em memória) — atualizar o nome
   * exibido não é crítico o bastante para virar um erro na tela de quem
   * chamou.
   */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
