import { CodigosErro, FalhaApi, MensagensErro } from '../servicos/erros';
import { GerenciadorSessao, type Persistencia } from '../sessao/gerenciador';
import type { Sessao } from '../sessao/sessao';

const AGORA = Date.now();

function sessao(refreshToken: string, token = `acesso-${refreshToken}`, expiraEm = AGORA + 30 * 60_000): Sessao {
  return { idUsuario: '1', email: 'ana@exemplo.com', nome: 'Ana Souza', tipo: 'candidato', statusEmpresa: null, token, refreshToken, expiraEm };
}

function memoria(inicial: Sessao | null = null): Persistencia & { texto: string | null } {
  const estado = {
    texto: inicial ? JSON.stringify(inicial) : null,
    ler: async () => estado.texto,
    gravar: async (texto: string) => {
      estado.texto = texto;
    },
    apagar: async () => {
      estado.texto = null;
    },
  };
  return estado;
}

describe('GerenciadorSessao (o RenovadorSessao do Android)', () => {
  test('renovações ao mesmo tempo viram uma só chamada ao servidor', async () => {
    const persistencia = memoria(sessao('r1'));
    let liberar!: (valor: Sessao) => void;
    const acao = jest.fn(() => new Promise<Sessao>((resolver) => (liberar = resolver)));
    const gerenciador = new GerenciadorSessao(persistencia, acao);
    const usada = (await gerenciador.carregar())!;

    const primeira = gerenciador.renovar(usada);
    const segunda = gerenciador.renovar(usada);
    liberar(sessao('r2'));

    await expect(primeira).resolves.toMatchObject({ refreshToken: 'r2' });
    await expect(segunda).resolves.toMatchObject({ refreshToken: 'r2' });
    expect(acao).toHaveBeenCalledTimes(1);
    expect(JSON.parse(persistencia.texto!).refreshToken).toBe('r2');
  });

  test('quem chega com a sessão antiga recebe a já renovada, sem reapresentar o refresh token velho', async () => {
    const acao = jest.fn(async () => sessao('r2'));
    const gerenciador = new GerenciadorSessao(memoria(sessao('r1')), acao);
    const antiga = (await gerenciador.carregar())!;
    await gerenciador.renovar(antiga);
    await expect(gerenciador.renovar(antiga)).resolves.toMatchObject({ refreshToken: 'r2' });
    expect(acao).toHaveBeenCalledTimes(1);
  });

  test('falha definitiva apaga a sessão e avisa; falha passageira não', async () => {
    const persistencia = memoria(sessao('r1'));
    const avisos: (string | null)[] = [];
    let erro: FalhaApi = new FalhaApi(MensagensErro.SEM_CONEXAO);
    const gerenciador = new GerenciadorSessao(persistencia, async () => {
      throw erro;
    });
    gerenciador.ouvir((_, aviso) => avisos.push(aviso));
    const usada = (await gerenciador.carregar())!;

    await expect(gerenciador.renovar(usada)).rejects.toThrow(MensagensErro.SEM_CONEXAO);
    expect(gerenciador.atual()).not.toBeNull();
    expect(persistencia.texto).not.toBeNull();

    erro = new FalhaApi(MensagensErro.SESSAO_EXPIRADA, { status: 401, codigo: CodigosErro.SESSAO_EXPIRADA });
    await expect(gerenciador.renovar(usada)).rejects.toThrow(MensagensErro.SESSAO_EXPIRADA);
    expect(gerenciador.atual()).toBeNull();
    expect(persistencia.texto).toBeNull();
    expect(avisos).toEqual([MensagensErro.SESSAO_EXPIRADA]);
  });

  test('comSessao renova o token vencido antes de enviar', async () => {
    const gerenciador = new GerenciadorSessao(memoria(sessao('r1', 'velho', AGORA - 1000)), async () => sessao('r2', 'novo'));
    const enviar = jest.fn(async (token: string) => token);
    await expect(gerenciador.comSessao(enviar)).resolves.toBe('novo');
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  test('comSessao: 401 renova uma vez e repete; 401 de novo encerra a sessão', async () => {
    const gerenciador = new GerenciadorSessao(memoria(sessao('r1', 'a')), async (s) => sessao(s.refreshToken + 'x', 'b'));
    const tokens: string[] = [];
    const resposta = await gerenciador.comSessao(async (token) => {
      tokens.push(token);
      if (token === 'a') throw new FalhaApi('Token inválido.', { status: 401 });
      return 'ok';
    });
    expect(resposta).toBe('ok');
    expect(tokens).toEqual(['a', 'b']);

    await expect(
      gerenciador.comSessao(async () => {
        throw new FalhaApi('Token inválido.', { status: 401 });
      }),
    ).rejects.toMatchObject({ codigo: CodigosErro.SESSAO_EXPIRADA });
    expect(gerenciador.atual()).toBeNull();
  });

  test('conta bloqueada encerra; 403 sem código (sem permissão) mantém a sessão', async () => {
    const gerenciador = new GerenciadorSessao(memoria(sessao('r1')), async () => sessao('r2'));
    await gerenciador.carregar();
    await expect(
      gerenciador.comSessao(async () => {
        throw new FalhaApi('Apenas empresas aprovadas.', { status: 403 });
      }),
    ).rejects.toThrow('Apenas empresas aprovadas.');
    expect(gerenciador.atual()).not.toBeNull();

    await expect(
      gerenciador.comSessao(async () => {
        throw new FalhaApi('Conta bloqueada.', { status: 403, codigo: CodigosErro.CONTA_BLOQUEADA });
      }),
    ).rejects.toThrow('Conta bloqueada.');
    expect(gerenciador.atual()).toBeNull();
  });

  test('depois de abrir sem sessão, o login vale para as chamadas seguintes (não a leitura antiga)', async () => {
    const gerenciador = new GerenciadorSessao(memoria(null), async () => sessao('r9'));
    await expect(gerenciador.carregar()).resolves.toBeNull();
    await gerenciador.salvar(sessao('r1', 'pessoa'));
    await expect(gerenciador.comSessao(async (token) => token)).resolves.toBe('pessoa');
    await gerenciador.salvar(sessao('r2', 'empresa'));
    await expect(gerenciador.comSessao(async (token) => token)).resolves.toBe('empresa');
    await gerenciador.encerrar();
    await expect(gerenciador.carregar()).resolves.toBeNull();
  });

  test('login feito enquanto o Keychain ainda é lido não é sobrescrito pela leitura', async () => {
    let liberar!: (texto: string | null) => void;
    const lenta: Persistencia = { ler: () => new Promise((r) => (liberar = r)), gravar: async () => undefined, apagar: async () => undefined };
    const gerenciador = new GerenciadorSessao(lenta, async () => sessao('r9'));
    const abertura = gerenciador.carregar();
    await gerenciador.salvar(sessao('r1', 'novo'));
    liberar(JSON.stringify(sessao('r0', 'antigo')));
    await expect(abertura).resolves.toMatchObject({ token: 'novo' });
  });

  test('sem sessão salva, comSessao falha com "sessão expirada" sem chamar a API', async () => {
    const enviar = jest.fn();
    const gerenciador = new GerenciadorSessao(memoria(null), async () => sessao('r2'));
    await expect(gerenciador.comSessao(enviar)).rejects.toMatchObject({ codigo: CodigosErro.SESSAO_EXPIRADA });
    expect(enviar).not.toHaveBeenCalled();
  });
});
