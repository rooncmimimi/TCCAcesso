import { createContext } from "react";

import type {
  CredenciaisLogin,
  RespostaCadastroPendenteVerificacao,
  RespostaLogin,
  RespostaLoginContaPausada,
  RespostaLoginEmailNaoVerificado,
  RespostaLoginDispositivo,
  RespostaLoginMfa,
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
  /**
   * Retorna `{ contaPausada: true }`, `{ emailNaoVerificado: true, email }` `{ mfaNecessario: true, desafioMfa }` ou `{ verificacaoDispositivo: true, desafioDispositivo }`
   * (sem criar sessão) quando o login precisa de uma etapa extra.
   */
  entrar: (
    credenciais: CredenciaisLogin,
  ) => Promise<UsuarioSessao | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado | RespostaLoginMfa | RespostaLoginDispositivo>;
  /**
   * O "depois de autenticar" de qualquer entrada (senha ou Google): guarda os tokens, normaliza o
   * usuário, conecta o socket e aplica as preferências de acessibilidade da conta. Quando a
   * resposta é uma etapa extra (`contaPausada`, `emailNaoVerificado`, `mfaNecessario` ou `verificacaoDispositivo`), devolve-a sem
   * criar sessão.
   */
  iniciarSessao: (
    resposta: RespostaLogin | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado | RespostaLoginMfa | RespostaLoginDispositivo,
  ) => Promise<UsuarioSessao | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado | RespostaLoginMfa | RespostaLoginDispositivo>;
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
