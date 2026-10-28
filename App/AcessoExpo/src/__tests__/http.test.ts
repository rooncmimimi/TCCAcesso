import { FalhaApi, MensagensErro } from '../servicos/erros';
import { montarUrl, requisitar } from '../servicos/http';

function resposta(status: number, corpo: string) {
  return { ok: status >= 200 && status < 300, status, text: async () => corpo } as Response;
}

describe('cliente HTTP', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  test('montarUrl ignora filtros vazios e codifica os valores', () => {
    expect(montarUrl('vagas', { search: ' dev júnior ', modalidade: null, publicoAlvo: '', page: 1 }, 'http://api/api/')).toBe(
      'http://api/api/vagas?search=dev%20j%C3%BAnior&page=1',
    );
  });

  test('envia JSON e o token; devolve o corpo lido', async () => {
    const chamada = jest.fn(async () => resposta(200, '{"ok":true}'));
    global.fetch = chamada as unknown as typeof fetch;
    await expect(requisitar('postagens', { metodo: 'POST', corpo: { conteudo: 'oi' }, token: 'abc', base: 'http://api' })).resolves.toEqual({ ok: true });
    const [url, opcoes] = chamada.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api/postagens');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.body).toBe('{"conteudo":"oi"}');
    expect(opcoes.headers).toMatchObject({ Authorization: 'Bearer abc', 'Content-Type': 'application/json' });
  });

  test('sem rede: mensagem de conexão', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    await expect(requisitar('vagas', { base: 'http://api' })).rejects.toThrow(MensagensErro.SEM_CONEXAO);
  });

  test('servidor que não responde a tempo: mensagem de demora', async () => {
    global.fetch = jest.fn(
      (_url: string, opcoes: RequestInit) =>
        new Promise((_, rejeitar) => opcoes.signal?.addEventListener('abort', () => rejeitar(new Error('abortado')))),
    ) as unknown as typeof fetch;
    await expect(requisitar('vagas', { base: 'http://api', tempoLimiteMs: 20 })).rejects.toThrow(MensagensErro.DEMOROU);
  });

  test('erro com corpo que não é JSON (proxy) usa o código HTTP', async () => {
    global.fetch = jest.fn(async () => resposta(502, '<html>Bad Gateway</html>')) as unknown as typeof fetch;
    const erro = await requisitar('vagas', { base: 'http://api' }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(FalhaApi);
    expect((erro as FalhaApi).message).toBe(MensagensErro.SERVICO_INDISPONIVEL);
  });
});
