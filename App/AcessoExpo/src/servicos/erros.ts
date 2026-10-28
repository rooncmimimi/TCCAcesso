/**
 * Mensagens e tradução de erros da API, iguais às do app Android (MensagensErro, CodigosErro e
 * TradutorErrosApi). A API já devolve mensagens em português prontas para o usuário; só os casos
 * sem mensagem útil ganham texto próprio.
 */
export const MensagensErro = {
  SEM_CONEXAO: 'Não foi possível conectar ao ACESSO. Verifique sua internet e tente novamente.',
  DEMOROU: 'O servidor demorou para responder. Tente novamente em instantes.',
  ERRO_GENERICO: 'Algo deu errado. Tente novamente.',
  SESSAO_EXPIRADA: 'Sua sessão expirou. Entre novamente.',
  MUITAS_TENTATIVAS: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
  SERVICO_INDISPONIVEL: 'O serviço está indisponível no momento. Tente novamente mais tarde.',
  CAMPOS: 'Confira os campos destacados.',
} as const;

/** Códigos que dizem por que a sessão acabou. Os dois últimos vêm da API em "detalhes.codigo". */
export const CodigosErro = {
  SESSAO_EXPIRADA: 'SESSAO_EXPIRADA',
  CONTA_BLOQUEADA: 'CONTA_BLOQUEADA',
  SENHA_ALTERADA: 'SENHA_ALTERADA',
} as const;

/** true quando o código significa que a sessão não tem mais volta (renovar não adianta). */
export function encerraSessao(codigo: string | null | undefined): boolean {
  return (
    codigo === CodigosErro.SESSAO_EXPIRADA ||
    codigo === CodigosErro.CONTA_BLOQUEADA ||
    codigo === CodigosErro.SENHA_ALTERADA
  );
}

/** Erro com mensagem pronta para mostrar e, quando a API informa, o erro de cada campo. */
export class FalhaApi extends Error {
  readonly status: number;
  readonly codigo: string | null;
  readonly campos: Record<string, string>;

  constructor(mensagem: string, opcoes: { status?: number; codigo?: string | null; campos?: Record<string, string> } = {}) {
    super(mensagem);
    this.name = 'FalhaApi';
    this.status = opcoes.status ?? 0;
    this.codigo = opcoes.codigo ?? null;
    this.campos = opcoes.campos ?? {};
  }
}

/**
 * Converte uma resposta de erro da API em FalhaApi. O formato é sempre
 * { sucesso: false, mensagem, erros: [{ campo, mensagem }], detalhes: { codigo } }
 * (erroMiddleware.js e validacaoMiddleware.js do Site/Backend).
 */
export function traduzirErroApi(status: number, corpo: unknown): FalhaApi {
  let mensagem: string | null = null;
  let codigo: string | null = null;
  const campos: Record<string, string> = {};

  if (corpo && typeof corpo === 'object') {
    const json = corpo as Record<string, unknown>;
    mensagem = typeof json.mensagem === 'string' ? json.mensagem : null;
    const detalhes = json.detalhes;
    if (detalhes && typeof detalhes === 'object' && typeof (detalhes as Record<string, unknown>).codigo === 'string') {
      codigo = (detalhes as Record<string, string>).codigo;
    }
    if (Array.isArray(json.erros)) {
      for (const item of json.erros) {
        if (!item || typeof item !== 'object') {
          continue;
        }
        const { campo, mensagem: mensagemCampo } = item as Record<string, unknown>;
        // Fica a primeira mensagem de cada campo (a API pode mandar várias regras do mesmo campo).
        if (typeof campo === 'string' && typeof mensagemCampo === 'string' && !(campo in campos)) {
          campos[campo] = mensagemCampo;
        }
      }
    }
  }

  if (status === 429) {
    return new FalhaApi(MensagensErro.MUITAS_TENTATIVAS, { status });
  }
  if (status >= 500) {
    // Mensagens 5xx da API podem ser técnicas ("Erro ao consultar o banco de dados.").
    return new FalhaApi(MensagensErro.SERVICO_INDISPONIVEL, { status });
  }
  if (status === 422 && Object.keys(campos).length > 0) {
    // "Erro de validação." sozinho não ajuda; os detalhes aparecem em cada campo.
    return new FalhaApi(MensagensErro.CAMPOS, { status, campos });
  }
  if (!mensagem) {
    mensagem = status === 401 ? MensagensErro.SESSAO_EXPIRADA : MensagensErro.ERRO_GENERICO;
  }
  return new FalhaApi(mensagem, { status, codigo, campos });
}

/** Mensagem para mostrar de qualquer erro (FalhaApi ou inesperado). */
export function mensagemDe(erro: unknown): string {
  return erro instanceof FalhaApi ? erro.message : MensagensErro.ERRO_GENERICO;
}
