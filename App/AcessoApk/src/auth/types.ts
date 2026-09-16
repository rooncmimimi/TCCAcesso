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
  /** Redesign visual — primeiro lugar do app a mostrar o logo de uma conta empresa fora da tela "Meu perfil" (ver `ProfileMenuScreen.tsx`). */
  logo?: string | null;
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
  /** Confirmado em `/auth/login`/`/auth/me` (Fase 15) — controla o fluxo de seguir direto vs. solicitação (Fase 14). */
  perfilPublico?: boolean;
  preferenciaMensagens?: string;
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
 * `POST /auth/register/candidato` (`Site/Backend/src/validators/authValidator.js`
 * — `regrasComuns` + `validarCadastroCandidato`). `telefone`/`cpf` são
 * opcionais no backend (`.optional({ values: "falsy" })`); a senha exige 8-72
 * caracteres com minúscula, maiúscula, número e símbolo — não duplicado aqui
 * como validação (Fase 11: "não duplicar regras do backend"), só como texto
 * de ajuda na tela.
 */
export interface CadastroCandidatoDados {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cpf?: string;
}

/**
 * `POST /auth/register/empresa`. `cnpj`/`razaoSocial` são obrigatórios;
 * `nomeFantasia` e o restante (`setor`/`porte`/`site`/`descricao`/`cidade`/
 * `estado`/`endereco`/`cep`) são opcionais no backend e ficam de fora do
 * formulário de cadastro desta fase (editáveis depois, no perfil da
 * empresa — Fase 18) para não sobrecarregar a primeira tela que a empresa
 * vê.
 */
export interface CadastroEmpresaDados {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
}

/**
 * A conta nasce pendente de confirmação sempre que o provedor de e-mail
 * está configurado no backend (`EmailService.disponivel()`) — confirmado ao
 * vivo na Fase 10 (é o caminho real hoje). Sem provedor configurado, o
 * cadastro já devolve sessão completa — por isso `CadastroResposta` reusa
 * `LoginSucesso` (mesmo formato) em vez de duplicar o tipo.
 */
export interface CadastroPendenteConfirmacao {
  sucesso: true;
  pendenteVerificacaoEmail: true;
  email: string;
}

export type CadastroResposta = LoginSucesso | CadastroPendenteConfirmacao;

/**
 * `loading`: restaurando a sessão salva (ainda não se sabe se há uma).
 * `authenticated` / `unauthenticated`: os dois estados normais.
 * `unsupported`: login válido, mas de um tipo de conta que o app não atende
 * (administrador — Fase 3, item 15). Existe para não forçar esse caso a virar
 * um `authenticated` sem tela nenhuma para mostrar, nem um `unauthenticated`
 * que esconderia o motivo do usuário.
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "unsupported";

/**
 * Gestão de conta (Fase 15) — `PATCH /auth/senha`, `POST /auth/conta/pausar`,
 * `DELETE /auth/conta`, `POST /auth/email/solicitar`,
 * `POST /auth/email/confirmar`, `POST/DELETE/POST /auth/sessoes*`.
 */

/** Uma sessão ativa (`refresh_tokens` não revogado/expirado) — nunca inclui o token em si, só metadados. */
export interface SessaoAtiva {
  id: string;
  userAgent: string | null;
  ip: string | null;
  criadoEm: string;
  expiraEm: string;
  /** A sessão a partir da qual esta chamada foi feita — o app nunca oferece "encerrar" para ela sem passar por `logout()`. */
  atual: boolean;
}
