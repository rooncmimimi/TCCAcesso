import { createContext } from "react";

import type {
  CredenciaisLogin,
  RespostaCadastroPendenteVerificacao,
  RespostaLoginContaPausada,
  RespostaLoginEmailNaoVerificado,
  TipoUsuario,
  Usuario,
} from "@/types";

/**
 * Sessão real da aplicação: autenticação JWT contra o backend Express.
 * Os tokens ficam em `localStorage` (ver `services/api.ts`, que também
 * renova automaticamente o access token expirado).
 */
export type UsuarioSessao = Usuario & {
  tipo: TipoUsuario;
  titulo?: string | null;
  cidade?: string | null;
  onboarded?: boolean;
};

export type SessaoContextValue = {
  usuario: UsuarioSessao | null;
  inicializado: boolean;
  carregando: boolean;
  autenticado: boolean;
  /** Retorna `{ contaPausada: true }` ou `{ emailNaoVerificado: true, email }` (sem criar sessão) quando o login precisa de uma etapa extra. */
  entrar: (
    credenciais: CredenciaisLogin,
  ) => Promise<UsuarioSessao | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado>;
  /** Retorna `{ pendenteVerificacaoEmail: true, email }` (sem criar sessão) quando o cadastro exige confirmação de e-mail. */
  registrarCandidato: (
    payload: Record<string, unknown>,
  ) => Promise<UsuarioSessao | RespostaCadastroPendenteVerificacao>;
  registrarEmpresa: (
    payload: Record<string, unknown>,
  ) => Promise<UsuarioSessao | RespostaCadastroPendenteVerificacao>;
  sair: () => Promise<void>;
  atualizar: (patch: Partial<UsuarioSessao>) => void;
  recarregar: () => Promise<void>;
};

export const SessaoContext = createContext<SessaoContextValue | null>(null);
