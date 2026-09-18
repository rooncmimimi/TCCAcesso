import { createContext } from "react";

import type { MotivoFimSessao } from "../services/api/cliente";
import type {
  StatusAutenticacao,
  UsuarioAutenticado,
  CadastroCandidatoDados,
  CadastroEmpresaDados,
  CadastroResposta,
  Credenciais,
  LoginResposta,
} from "./types";

export interface AutenticacaoContextValue {
  status: StatusAutenticacao;
  usuario: UsuarioAutenticado | null;
  autenticado: boolean;
  /** `true` só durante a restauração inicial da sessão salva, não durante um login em andamento (isso é local de cada tela). */
  carregando: boolean;
  /** Motivo pelo qual a sessão anterior terminou (renovação falhou, conta bloqueada ou senha alterada), para a tela de login mostrar uma vez. */
  motivoFimSessao: MotivoFimSessao | null;
  entrar: (credenciais: Credenciais) => Promise<LoginResposta>;
  /**
   * Só autentica quando a resposta já traz sessão (backend sem provedor de e-mail); no caso comum a
   * conta fica aguardando a confirmação do e-mail.
   */
  cadastrarCandidato: (dados: CadastroCandidatoDados) => Promise<CadastroResposta>;
  cadastrarEmpresa: (dados: CadastroEmpresaDados) => Promise<CadastroResposta>;
  /**
   * Encerra a sessão. `motivo` é para as saídas que não partem do botão "Sair" — hoje a troca de
   * senha, que invalida a sessão no backend —, e é o que a tela de login mostra em seguida.
   */
  sair: (motivo?: MotivoFimSessao) => Promise<void>;
  limparMotivoFimSessao: () => void;
  /**
   * Busca `/auth/me` de novo e atualiza o usuário do contexto. Telas que editam nome ou e-mail
   * chamam isto para o restante do app (feed, menu do perfil) não continuar com o dado antigo.
   *
   * Se falhar, mantém o usuário atual: atualizar o nome exibido não justifica mostrar um erro a
   * quem chamou.
   */
  atualizarUsuario: () => Promise<void>;
}

export const AutenticacaoContext = createContext<AutenticacaoContextValue | null>(null);
