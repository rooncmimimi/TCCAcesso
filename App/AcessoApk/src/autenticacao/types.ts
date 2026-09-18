/**
 * Tipos do contrato de autenticação da API. Os nomes em português são os que o backend envia e
 * espera (`models/Usuario.js`, `models/Empresa.js`, `services/AutenticacaoService.js`).
 */

/** `Site/Backend/src/models/Usuario.js`: `tipo_usuario` ENUM. */
export type TipoUsuario = "candidato" | "empresa" | "administrador";

/** `Site/Backend/src/models/Empresa.js`: `status_aprovacao` ENUM. */
export type StatusAprovacaoEmpresa = "pendente" | "aprovada" | "reprovada" | "suspensa";

export interface EmpresaResumo {
  statusAprovacao: StatusAprovacaoEmpresa;
  motivoReprovacao?: string | null;
  motivoSuspensao?: string | null;
  /** Logo da empresa, usado como avatar da conta no menu do perfil. */
  logo?: string | null;
  [chave: string]: unknown;
}

/**
 * O `usuario` devolvido por `/auth/login` e `/auth/me`. Só os campos usados pelo app têm nome; os
 * demais continuam acessíveis pelo índice `[chave: string]`.
 */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  tipoUsuario: TipoUsuario;
  empresa?: EmpresaResumo | null;
  /** Valor inicial da opção de privacidade em Configurações. Em perfil privado, seguir vira uma solicitação. */
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
  usuario: UsuarioAutenticado;
  token: string;
  refreshToken: string;
}

/** Os dois "estados intermediários" do login: ambos vêm com status HTTP 200, nunca um código de erro. */
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
 * `POST /auth/register/candidato` (`validators/autenticacaoValidator.js`). `telefone` e `cpf` são
 * opcionais. A regra da senha (8 a 72 caracteres, com minúscula, maiúscula, número e símbolo) fica
 * só no backend; a tela mostra apenas o texto de ajuda.
 */
export interface CadastroCandidatoDados {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cpf?: string;
}

/**
 * `POST /auth/register/empresa`. `cnpj` e `razaoSocial` são obrigatórios. Os demais dados da
 * empresa são opcionais no backend e ficam para a edição do perfil, para não alongar o primeiro
 * cadastro.
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
 * Com o provedor de e-mail configurado no backend (`EmailService.disponivel()`), a conta nasce
 * aguardando confirmação. Sem provedor, o cadastro já devolve a sessão, por isso `CadastroResposta`
 * reaproveita `LoginSucesso`.
 */
export interface CadastroPendenteConfirmacao {
  sucesso: true;
  pendenteVerificacaoEmail: true;
  email: string;
}

export type CadastroResposta = LoginSucesso | CadastroPendenteConfirmacao;

/**
 * `carregando`: restaurando a sessão salva. `autenticado` e `naoAutenticado`: os estados normais.
 * `naoSuportado`: login válido de uma conta que o app não atende (administrador), para a tela
 * explicar o motivo em vez de só voltar ao login.
 */
export type StatusAutenticacao = "carregando" | "autenticado" | "naoAutenticado" | "naoSuportado";

/** Uma sessão ativa (linha em `sessoes` não revogada nem expirada), nunca inclui o token em si, só metadados. */
export interface SessaoAtiva {
  id: string;
  userAgent: string | null;
  ip: string | null;
  criadoEm: string;
  expiraEm: string;
  /** Sessão deste aparelho. Para encerrá-la, o app usa `sair()`, nunca a revogação da lista. */
  atual: boolean;
}
