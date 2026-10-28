/**
 * Sessão do usuário logado, igual à SessaoUsuario do app Android: JWT curto (token) + refresh token
 * rotativo, devolvidos por POST /auth/login, /auth/register/candidato e /auth/refresh.
 */
export type TipoConta = 'candidato' | 'empresa';

export interface Sessao {
  idUsuario: string;
  email: string;
  nome: string;
  tipo: TipoConta;
  /** Só para empresa: pendente, aprovada, reprovada ou suspensa. null quando não se aplica ou não se sabe. */
  statusEmpresa: string | null;
  token: string;
  refreshToken: string;
  /** Quando o token vence, em milissegundos desde 1970. */
  expiraEm: number;
}

export const EMPRESA_APROVADA = 'aprovada';

export const CONTA_DE_ADMINISTRACAO = 'Esta conta é de administração. Use o painel administrativo pelo site.';

/** Usado só se o token não informar quando vence; a API emite tokens de 30 minutos por padrão. */
const VALIDADE_PADRAO_MS = 15 * 60 * 1000;

/** Considera vencido um minuto antes, para não usar um token no limite. */
export function estaExpirada(sessao: Sessao, agora: number = Date.now()): boolean {
  return agora >= sessao.expiraEm - 60_000;
}

/**
 * Empresa ainda não liberada pela moderação (pendente, reprovada ou suspensa). Status desconhecido
 * não bloqueia: a API recusa as rotas de empresa se for preciso.
 */
export function empresaAguardando(sessao: Sessao | null): boolean {
  return sessao?.tipo === 'empresa' && sessao.statusEmpresa !== null && sessao.statusEmpresa !== EMPRESA_APROVADA;
}

/**
 * Lê { usuario, token, refreshToken }. Conta de administração não entra pelo app (lança erro com a
 * mensagem). O refresh não traz a empresa; nesse caso o status anterior é mantido.
 */
export function lerSessao(json: Record<string, unknown>, statusEmpresaAnterior: string | null = null, agora: number = Date.now()): Sessao {
  const usuario = (json.usuario ?? {}) as Record<string, unknown>;
  const tipo = usuario.tipoUsuario;
  if (tipo !== 'candidato' && tipo !== 'empresa') {
    throw new Error(CONTA_DE_ADMINISTRACAO);
  }
  let statusEmpresa = statusEmpresaAnterior;
  const empresa = usuario.empresa as Record<string, unknown> | null | undefined;
  if (empresa && typeof empresa === 'object' && typeof empresa.statusAprovacao === 'string') {
    statusEmpresa = empresa.statusAprovacao;
  }
  const token = String(json.token ?? '');
  return {
    idUsuario: String(usuario.id ?? ''),
    email: String(usuario.email ?? ''),
    nome: String(usuario.nome ?? ''),
    tipo,
    statusEmpresa,
    token,
    refreshToken: String(json.refreshToken ?? ''),
    expiraEm: lerExpiracaoJwt(token, agora),
  };
}

/**
 * Lê o "exp" (segundos) do JWT, só para saber quando renovar. Quem confere a assinatura do token
 * é a API, nunca o app.
 */
export function lerExpiracaoJwt(token: string, agora: number = Date.now()): number {
  try {
    const carga = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const completa = carga + '='.repeat((4 - (carga.length % 4)) % 4);
    const exp = JSON.parse(atob(completa)).exp;
    if (typeof exp === 'number' && Number.isFinite(exp)) {
      return exp * 1000;
    }
  } catch {
    // Formato inesperado: usa a validade padrão.
  }
  return agora + VALIDADE_PADRAO_MS;
}

/** Confere o que veio do armazenamento (pode ser de uma versão antiga do app ou estar corrompido). */
export function desserializar(texto: string | null): Sessao | null {
  if (!texto) {
    return null;
  }
  try {
    const dados = JSON.parse(texto) as Partial<Sessao>;
    if (
      typeof dados.idUsuario === 'string' &&
      typeof dados.token === 'string' && dados.token &&
      typeof dados.refreshToken === 'string' && dados.refreshToken &&
      (dados.tipo === 'candidato' || dados.tipo === 'empresa') &&
      typeof dados.expiraEm === 'number'
    ) {
      return {
        idUsuario: dados.idUsuario,
        email: String(dados.email ?? ''),
        nome: String(dados.nome ?? ''),
        tipo: dados.tipo,
        statusEmpresa: typeof dados.statusEmpresa === 'string' ? dados.statusEmpresa : null,
        token: dados.token,
        refreshToken: dados.refreshToken,
        expiraEm: dados.expiraEm,
      };
    }
  } catch {
    // Conteúdo inválido: trata como sem sessão.
  }
  return null;
}
