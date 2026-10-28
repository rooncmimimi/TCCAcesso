import { CodigosErro, FalhaApi, MensagensErro } from '../servicos/erros';
import { requisitar, type OpcoesRequisicao } from '../servicos/http';
import { lerSessao, type Sessao } from '../sessao/sessao';

/**
 * Autenticação pela API do Site (rotas /api/auth de autenticacaoRoutes.js), a mesma do site e do
 * app Android: as contas ficam na tabela usuarios, a senha é conferida com bcrypt no servidor e a
 * sessão é um JWT curto + refresh token rotativo.
 */

export type ResultadoLogin =
  | { tipo: 'autenticado'; sessao: Sessao }
  | { tipo: 'emailNaoConfirmado'; email: string }
  | { tipo: 'contaPausada' };

export type ResultadoCadastro =
  | { tipo: 'autenticado'; sessao: Sessao }
  | { tipo: 'confirmarEmail'; email: string };

export interface DadosCadastroPessoa {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  cpf: string;
  /** AAAA-MM-DD */
  dataNascimento: string;
  cidade: string;
  estado: string;
}

/** O ACESSO por enquanto atende só o Brasil; o site manda o mesmo valor. */
const PAIS_PADRAO = 'BR';

type Base = Pick<OpcoesRequisicao, 'base'>;

export function corpoLogin(email: string, senha: string, confirmarReativacao = false): Record<string, unknown> {
  const corpo: Record<string, unknown> = { email: email.trim(), senha };
  if (confirmarReativacao) {
    corpo.confirmarReativacao = true;
  }
  return corpo;
}

/** POST /auth/login → { usuario, token, refreshToken } | { emailNaoVerificado, email } | { contaPausada } */
export async function entrar(email: string, senha: string, confirmarReativacao = false, opcoes: Base = {}): Promise<ResultadoLogin> {
  const json = await requisitar('auth/login', { ...opcoes, metodo: 'POST', corpo: corpoLogin(email, senha, confirmarReativacao) });
  if (json.emailNaoVerificado === true) {
    return { tipo: 'emailNaoConfirmado', email: String(json.email ?? email.trim()) };
  }
  if (json.contaPausada === true) {
    return { tipo: 'contaPausada' };
  }
  return { tipo: 'autenticado', sessao: lerSessaoOuFalha(json) };
}

export function corpoCadastroPessoa(dados: DadosCadastroPessoa): Record<string, unknown> {
  return {
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    senha: dados.senha,
    telefone: dados.telefone.replace(/\D/g, ''),
    cpf: dados.cpf.replace(/\D/g, ''),
    pais: PAIS_PADRAO,
    dataNascimento: dados.dataNascimento,
    cidade: dados.cidade.trim(),
    estado: dados.estado.trim().toUpperCase(),
  };
}

/** POST /auth/register/candidato → sessão, ou { pendenteVerificacaoEmail, email } se a API pedir confirmação. */
export async function cadastrarPessoa(dados: DadosCadastroPessoa, opcoes: Base = {}): Promise<ResultadoCadastro> {
  const json = await requisitar('auth/register/candidato', { ...opcoes, metodo: 'POST', corpo: corpoCadastroPessoa(dados) });
  if (json.pendenteVerificacaoEmail === true) {
    return { tipo: 'confirmarEmail', email: String(json.email ?? dados.email.trim().toLowerCase()) };
  }
  return { tipo: 'autenticado', sessao: lerSessaoOuFalha(json) };
}

/** POST /auth/cadastro/confirmar-email { email, codigo }. Não devolve sessão: depois é só entrar. */
export async function confirmarEmail(email: string, codigo: string, opcoes: Base = {}): Promise<void> {
  await requisitar('auth/cadastro/confirmar-email', {
    ...opcoes,
    metodo: 'POST',
    corpo: { email: email.trim().toLowerCase(), codigo: codigo.trim() },
  });
}

/** POST /auth/cadastro/reenviar-confirmacao { email }. O servidor exige 60 s entre envios. */
export async function reenviarCodigo(email: string, opcoes: Base = {}): Promise<void> {
  await requisitar('auth/cadastro/reenviar-confirmacao', { ...opcoes, metodo: 'POST', corpo: { email: email.trim().toLowerCase() } });
}

/** POST /auth/senha/esqueci { email }. A resposta é sempre genérica (não revela se o e-mail existe). */
export async function pedirNovaSenha(email: string, opcoes: Base = {}): Promise<void> {
  await requisitar('auth/senha/esqueci', { ...opcoes, metodo: 'POST', corpo: { email: email.trim() } });
}

/**
 * POST /auth/refresh { refreshToken }. A resposta não traz a empresa, então o status dela é mantido.
 * Recusa (401/403) vira "sessão expirada", que encerra a sessão; conta bloqueada mantém a mensagem
 * da moderação. Falhas passageiras (rede, 429, 5xx) não encerram nada.
 */
export async function renovar(sessao: Sessao, opcoes: Base = {}): Promise<Sessao> {
  try {
    const json = await requisitar('auth/refresh', { ...opcoes, metodo: 'POST', corpo: { refreshToken: sessao.refreshToken } });
    return lerSessaoOuFalha(json, sessao.statusEmpresa);
  } catch (erro) {
    if (erro instanceof FalhaApi && (erro.status === 401 || erro.status === 403) && erro.codigo !== CodigosErro.CONTA_BLOQUEADA) {
      throw new FalhaApi(MensagensErro.SESSAO_EXPIRADA, { status: erro.status, codigo: CodigosErro.SESSAO_EXPIRADA });
    }
    throw erro;
  }
}

/** GET /auth/me → status de aprovação da empresa (o refresh não traz), ou null se não houver empresa. */
export async function carregarStatusEmpresa(token: string, opcoes: Base = {}): Promise<string | null> {
  const json = await requisitar<{ usuario?: { empresa?: { statusAprovacao?: unknown } | null } }>('auth/me', { ...opcoes, token });
  const status = json.usuario?.empresa?.statusAprovacao;
  return typeof status === 'string' ? status : null;
}

/** POST /auth/logout { refreshToken }. Falha aqui não impede sair: a sessão local é apagada de qualquer jeito. */
export async function sair(sessao: Sessao, opcoes: Base = {}): Promise<void> {
  try {
    await requisitar('auth/logout', {
      ...opcoes,
      metodo: 'POST',
      token: sessao.token,
      corpo: { refreshToken: sessao.refreshToken },
      tempoLimiteMs: 10_000,
    });
  } catch {
    // O refresh token vence sozinho no servidor.
  }
}

function lerSessaoOuFalha(json: Record<string, unknown>, statusEmpresaAnterior: string | null = null): Sessao {
  try {
    return lerSessao(json, statusEmpresaAnterior);
  } catch (erro) {
    throw new FalhaApi(erro instanceof Error ? erro.message : MensagensErro.ERRO_GENERICO);
  }
}
