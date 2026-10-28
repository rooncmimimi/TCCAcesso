import { URL_API } from './config';
import { FalhaApi, MensagensErro, traduzirErroApi } from './erros';

/**
 * A API publicada fica num serviço gratuito que "dorme" sem uso; a primeira chamada pode levar
 * perto de um minuto para acordar. Por isso o limite é largo (o app Android usa 60 s de leitura).
 */
const TEMPO_LIMITE_MS = 60_000;

export type Consulta = Record<string, string | number | null | undefined>;

export interface OpcoesRequisicao {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  corpo?: unknown;
  token?: string | null;
  consulta?: Consulta;
  /** Outra API (os testes de contrato usam a API local). */
  base?: string;
  tempoLimiteMs?: number;
}

/** Monta o endereço final; parâmetros vazios ficam de fora (a API trata ausente como "todos"). */
export function montarUrl(caminho: string, consulta: Consulta = {}, base: string = URL_API): string {
  const parametros = Object.entries(consulta)
    .filter(([, valor]) => valor !== null && valor !== undefined && String(valor).trim() !== '')
    .map(([chave, valor]) => `${encodeURIComponent(chave)}=${encodeURIComponent(String(valor).trim())}`);
  const endereco = `${base.replace(/\/+$/, '')}/${caminho.replace(/^\/+/, '')}`;
  return parametros.length > 0 ? `${endereco}?${parametros.join('&')}` : endereco;
}

/**
 * Faz a chamada e devolve o JSON da resposta. Qualquer falha vira FalhaApi com mensagem pronta
 * para a tela (sem internet, servidor demorando, erro da API traduzido).
 */
export async function requisitar<T = Record<string, unknown>>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (opcoes.corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
  }
  if (opcoes.token) {
    cabecalhos.Authorization = `Bearer ${opcoes.token}`;
  }

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), opcoes.tempoLimiteMs ?? TEMPO_LIMITE_MS);
  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho, opcoes.consulta, opcoes.base), {
      method: opcoes.metodo ?? 'GET',
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: controle.signal,
    });
  } catch {
    throw new FalhaApi(controle.signal.aborted ? MensagensErro.DEMOROU : MensagensErro.SEM_CONEXAO);
  } finally {
    clearTimeout(relogio);
  }

  let json: unknown = null;
  try {
    const texto = await resposta.text();
    json = texto ? JSON.parse(texto) : null;
  } catch {
    // Corpo que não é JSON (ex.: página de erro de um proxy): o código HTTP decide a mensagem.
    json = null;
  }

  if (!resposta.ok) {
    throw traduzirErroApi(resposta.status, json);
  }
  return (json ?? {}) as T;
}
