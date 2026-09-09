/**
 * Tipos do contrato real de autenticação do backend (Site/Backend), conforme
 * auditoria da Fase 3. Nomes de campo em português são LITERAIS ao que a API
 * envia/espera (`models/Usuario.js`, `models/Empresa.js`,
 * `services/authService.js`) — não são estilo, são o contrato.
 */

/** `Site/Backend/src/models/Usuario.js` — `tipo_usuario` ENUM. */
export type TipoUsuario = "candidato" | "empresa" | "administrador";

/** `Site/Backend/src/models/Empresa.js` — `status_aprovacao` ENUM. */
export type StatusAprovacaoEmpresa = "pendente" | "aprovada" | "reprovada" | "suspensa";

export interface EmpresaResumo {
  statusAprovacao: StatusAprovacaoEmpresa;
  motivoReprovacao?: string | null;
  motivoSuspensao?: string | null;
  [chave: string]: unknown;
}

/**
 * O objeto `usuario` de `/auth/login` e `/auth/me`. Tipado só com os campos
 * que o app usa nesta fase — o backend envia mais campos (todo o resto do
 * model), e eles continuam disponíveis em tempo de execução (índice `[chave:
 * string]`), só não são nomeados aqui até uma tela futura precisar deles.
 */
export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  tipoUsuario: TipoUsuario;
  empresa?: EmpresaResumo | null;
  [chave: string]: unknown;
}

export interface Credenciais {
  email: string;
  senha: string;
  /** Só quando a conta está pausada e o usuário confirmou reativar (`contaPausada`). */
  confirmarReativacao?: boolean;
}

export interface LoginSucesso {
  sucesso: true;
  usuario: AuthUser;
  token: string;
  refreshToken: string;
}

/** Os dois "estados intermediários" do login — ambos vêm com status HTTP 200, nunca um código de erro. */
export interface LoginContaPausada {
  sucesso: true;
  contaPausada: true;
}
export interface LoginEmailNaoVerificado {
  sucesso: true;
  emailNaoVerificado: true;
  email: string;
}

export type LoginResposta = LoginSucesso | LoginContaPausada | LoginEmailNaoVerificado;

/**
 * `loading`: restaurando a sessão salva (ainda não se sabe se há uma).
 * `authenticated` / `unauthenticated`: os dois estados normais.
 * `unsupported`: login válido, mas de um tipo de conta que o app não atende
 * (administrador — Fase 3, item 15). Existe para não forçar esse caso a virar
 * um `authenticated` sem tela nenhuma para mostrar, nem um `unauthenticated`
 * que esconderia o motivo do usuário.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "unsupported";
