/**
 * @jest-environment node
 *
 * Contrato do app com a API real (Site/Backend). Só roda quando ACESSO_API_TESTE_URL aponta para uma
 * API de TESTE, nunca para a de produção: o teste cria contas, publicações e candidaturas.
 *
 *   ACESSO_API_TESTE_URL=http://localhost:3000/api npx jest contrato
 *
 * Opcional: ACESSO_API_TESTE_EMPRESA_EMAIL e ACESSO_API_TESTE_EMPRESA_SENHA de uma empresa já
 * aprovada nessa API, para testar vaga, candidatura e painel da empresa.
 *
 * Usa as mesmas funções das telas (api/autenticacao, api/conteudo e leitores), com a sessão em memória
 * no lugar do Keychain. O fetch do Expo não funciona no Jest (o jest-expo o troca por um stub), então
 * as chamadas saem pelo http do Node: o que se confere aqui é o contrato (caminhos, corpos e respostas),
 * não o fetch do iPhone.
 */
/// <reference types="node" />
/* eslint-disable @typescript-eslint/no-require-imports -- os módulos do app são carregados depois dos mocks e do fetch do Node */
import type * as Autenticacao from '../api/autenticacao';
import type * as Conteudo from '../api/conteudo';
import type { FalhaApi as TipoFalhaApi } from '../servicos/erros';
import type { GerenciadorSessao } from '../sessao/gerenciador';
import type { Sessao } from '../sessao/sessao';

const BASE = process.env.ACESSO_API_TESTE_URL?.replace(/\/+$/, '');
const EMPRESA_EMAIL = process.env.ACESSO_API_TESTE_EMPRESA_EMAIL;
const EMPRESA_SENHA = process.env.ACESSO_API_TESTE_EMPRESA_SENHA;

jest.mock('../servicos/config', () => ({
  ...jest.requireActual('../servicos/config'),
  URL_API: process.env.ACESSO_API_TESTE_URL?.replace(/\/+$/, '') ?? 'http://api-de-teste-nao-definida',
}));

jest.mock('../sessao/global', () => {
  const { GerenciadorSessao: Gerenciador } = jest.requireActual('../sessao/gerenciador');
  const { renovar } = jest.requireActual('../api/autenticacao');
  let texto: string | null = null;
  return {
    sessaoGlobal: new Gerenciador(
      {
        ler: async () => texto,
        gravar: async (novo: string) => {
          texto = novo;
        },
        apagar: async () => {
          texto = null;
        },
      },
      (sessao: Sessao) => renovar(sessao),
    ),
  };
});

const descrever = BASE ? describe : describe.skip;

descrever('contrato com a API real', () => {
  jest.setTimeout(60_000);

  let auth: typeof Autenticacao;
  let conteudo: typeof Conteudo;
  let sessaoGlobal: GerenciadorSessao;
  let FalhaApi: typeof TipoFalhaApi;
  let MensagensErro: typeof import('../servicos/erros').MensagensErro;
  let CodigosErro: typeof import('../servicos/erros').CodigosErro;
  let requisitar: typeof import('../servicos/http').requisitar;

  const marca = Date.now().toString(36);
  const pessoa = {
    nome: 'Pessoa Teste iPhone',
    email: `iphone.${marca}@acesso.test`,
    senha: 'Senha!Forte1',
    telefone: '(81) 98765-4321',
    cpf: gerarCpf(),
    dataNascimento: '1990-05-10',
    cidade: 'Recife',
    estado: 'pe',
  };
  let sessaoPessoa: Sessao | null = null;

  beforeAll(() => {
    global.fetch = fetchNode as unknown as typeof fetch;
    auth = require('../api/autenticacao');
    conteudo = require('../api/conteudo');
    sessaoGlobal = require('../sessao/global').sessaoGlobal;
    ({ FalhaApi, MensagensErro, CodigosErro } = require('../servicos/erros'));
    ({ requisitar } = require('../servicos/http'));
  });

  test('cadastro de pessoa com o corpo do app cria a conta', async () => {
    const resultado = await auth.cadastrarPessoa(pessoa);
    if (resultado.tipo === 'confirmarEmail') {
      // API com envio de e-mail ligado: sem sessão até confirmar o código. O resto depende de sessão.
      expect(resultado.email).toBe(pessoa.email);
      return;
    }
    expect(resultado.sessao).toMatchObject({ tipo: 'candidato', email: pessoa.email, nome: pessoa.nome, statusEmpresa: null });
    expect(resultado.sessao.expiraEm).toBeGreaterThan(Date.now());
    sessaoPessoa = resultado.sessao;
    await sessaoGlobal.salvar(resultado.sessao);
  });

  test('erro de validação volta por campo, para destacar na tela', async () => {
    const erro = await auth.cadastrarPessoa({ ...pessoa, email: `outro.${marca}@acesso.test`, cpf: '' }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(FalhaApi);
    expect((erro as TipoFalhaApi).message).toBe(MensagensErro.CAMPOS);
    expect((erro as TipoFalhaApi).campos.cpf).toBeTruthy();
  });

  test('entrar, senha errada, renovar e /auth/me', async () => {
    if (!sessaoPessoa) return;
    const login = await auth.entrar(pessoa.email, pessoa.senha);
    expect(login.tipo).toBe('autenticado');

    const errada = await auth.entrar(pessoa.email, 'Errada!123').catch((e: unknown) => e);
    expect(errada).toBeInstanceOf(FalhaApi);
    expect((errada as TipoFalhaApi).status).toBe(401);
    expect((errada as TipoFalhaApi).message).not.toBe(MensagensErro.ERRO_GENERICO);

    const atual = sessaoGlobal.atual()!;
    const renovada = await sessaoGlobal.renovar(atual);
    expect(renovada.refreshToken).not.toBe(atual.refreshToken);
    // O refresh token é rotativo: daqui em diante só a sessão renovada vale.
    sessaoPessoa = renovada;
    expect(renovada.token).toBeTruthy();
    await expect(sessaoGlobal.comSessao((token) => auth.carregarStatusEmpresa(token))).resolves.toBeNull();
  });

  test('publicar, ver no feed e curtir/descurtir', async () => {
    if (!sessaoPessoa) return;
    const texto = `Publicação de teste do app iPhone ${marca}`;
    await conteudo.publicar(texto);
    const feed = await conteudo.listarPublicacoes();
    const minha = feed.find((item) => item.conteudo === texto);
    expect(minha).toMatchObject({ nomeAutor: pessoa.nome, curtidas: 0, curtidoPorMim: false, quando: 'agora mesmo' });

    await expect(conteudo.curtir(minha!.id)).resolves.toEqual({ curtido: true, total: 1 });
    await expect(conteudo.curtir(minha!.id)).resolves.toEqual({ curtido: false, total: 0 });
  });

  test('vagas com filtros, perfil, candidaturas e notificações', async () => {
    if (!sessaoPessoa) return;
    expect(Array.isArray(await conteudo.listarVagas())).toBe(true);
    expect(Array.isArray(await conteudo.listarVagas({ busca: 'analista', modalidade: 'remoto', publicoAlvo: 'pcd' }))).toBe(true);

    const perfil = await conteudo.carregarMeuPerfil('candidato', sessaoPessoa.idUsuario);
    expect(perfil).toMatchObject({ tipo: 'candidato', nome: pessoa.nome, usuarioId: sessaoPessoa.idUsuario });
    expect(JSON.stringify(perfil)).not.toContain(pessoa.cpf.replace(/\D/g, ''));

    expect(await conteudo.listarCandidaturas()).toEqual([]);
    expect(Array.isArray(await conteudo.listarNotificacoes())).toBe(true);
    expect(typeof (await conteudo.contarNaoLidas())).toBe('number');
    await expect(conteudo.marcarTodasComoLidas()).resolves.toBeUndefined();
  });

  test('empresa criada pela conta de pessoa nasce em análise e não tem o painel', async () => {
    if (!sessaoPessoa) return;
    // O app iPhone ainda não cadastra empresa (é feito pelo site ou pelo app Android); aqui só para ter uma.
    const json = await sessaoGlobal.comSessao((token) =>
      requisitar('auth/register/empresa', {
        metodo: 'POST',
        token,
        corpo: {
          nome: 'Responsável Teste',
          email: `empresa.${marca}@acesso.test`,
          senha: 'Senha!Forte1',
          cnpj: gerarCnpj(),
          razaoSocial: `Empresa Teste ${marca} Ltda`,
        },
      }),
    );
    if (!('token' in json)) return; // e-mail de confirmação ligado
    const { lerSessao, empresaAguardando } = require('../sessao/sessao');
    const empresa: Sessao = lerSessao(json);
    expect(empresa.tipo).toBe('empresa');
    expect(empresa.statusEmpresa).toBe('pendente');
    expect(empresaAguardando(empresa)).toBe(true);

    sessaoPessoa = sessaoGlobal.atual();
    await sessaoGlobal.salvar(empresa);
    await expect(sessaoGlobal.comSessao((token) => auth.carregarStatusEmpresa(token))).resolves.toBe('pendente');
    const painel = await conteudo.carregarResumoEmpresa().catch((e: unknown) => e);
    if (painel instanceof FalhaApi) {
      // Recusa por permissão não pode derrubar a sessão.
      expect(painel.status).toBe(403);
      expect(sessaoGlobal.atual()).not.toBeNull();
    }
    await sessaoGlobal.salvar(sessaoPessoa!);
  });

  const comEmpresa = EMPRESA_EMAIL && EMPRESA_SENHA ? test : test.skip;
  comEmpresa('vaga publicada, candidatura da pessoa e painel da empresa aprovada', async () => {
    if (!sessaoPessoa) return;
    const login = await auth.entrar(EMPRESA_EMAIL!, EMPRESA_SENHA!);
    if (login.tipo !== 'autenticado') throw new Error('Empresa de teste não conseguiu entrar.');
    expect(login.sessao.statusEmpresa).toBe('aprovada');

    sessaoPessoa = sessaoGlobal.atual();
    await sessaoGlobal.salvar(login.sessao);
    const titulo = `Vaga de teste iPhone ${marca}`;
    await sessaoGlobal.comSessao((token) =>
      requisitar('vagas', {
        metodo: 'POST',
        token,
        corpo: {
          titulo,
          descricao: 'Descrição da vaga de teste criada pelo contrato do app iPhone.',
          modalidade: 'remoto',
          contrato: 'clt',
          publicoAlvo: 'pcd',
          status: 'aberta',
          recursosAcessibilidade: ['interprete_libras', 'jornada_adaptavel'],
        },
      }),
    );
    const painel = await conteudo.carregarResumoEmpresa();
    const vagaNoPainel = painel.vagas.find((vaga) => vaga.titulo === titulo);
    expect(vagaNoPainel).toBeDefined();
    expect(painel.vagasAbertas).toBeGreaterThanOrEqual(1);
    expect((await conteudo.carregarMeuPerfil('empresa', login.sessao.idUsuario)).statusEmpresa).toBe('aprovada');

    await sessaoGlobal.salvar(sessaoPessoa!);
    const encontradas = await conteudo.listarVagas({ busca: titulo, modalidade: 'remoto', publicoAlvo: 'pcd' });
    const vaga = encontradas.find((item) => item.titulo === titulo);
    expect(vaga).toMatchObject({ modalidade: 'remoto', contrato: 'clt', publicoAlvo: 'pcd' });
    const detalhe = await conteudo.obterVaga(vaga!.id);
    expect(detalhe.recursosAcessibilidade).toEqual(['interprete_libras', 'jornada_adaptavel']);

    await conteudo.candidatar(vaga!.id, 'Tenho interesse e uso leitor de tela.');
    const candidaturas = await conteudo.listarCandidaturas();
    expect(candidaturas.find((item) => item.vagaId === vaga!.id)).toMatchObject({ tituloVaga: titulo, status: 'pendente' });

    const repetida = await conteudo.candidatar(vaga!.id).catch((e: unknown) => e);
    expect(repetida).toBeInstanceOf(FalhaApi);
    expect((repetida as TipoFalhaApi).message).not.toBe(MensagensErro.ERRO_GENERICO);

    sessaoPessoa = sessaoGlobal.atual();
    await sessaoGlobal.salvar(login.sessao);
    expect(await conteudo.contarNaoLidas()).toBeGreaterThanOrEqual(1);
    await sessaoGlobal.salvar(sessaoPessoa!);
  });

  test('sair revoga a renovação', async () => {
    if (!sessaoPessoa) return;
    const atual = sessaoGlobal.atual()!;
    await auth.sair(atual);
    const erro = await auth.renovar(atual).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(FalhaApi);
    expect((erro as TipoFalhaApi).codigo).toBe(CodigosErro.SESSAO_EXPIRADA);
  });
});

/** CPF válido aleatório (dígitos verificadores corretos), para não colidir entre execuções. */
function gerarCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(base).size === 1) base[0] = (base[0] + 1) % 10;
  const digito = (numeros: number[]) => {
    const soma = numeros.reduce((total, n, i) => total + n * (numeros.length + 1 - i), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join('');
}

function gerarCnpj(): string {
  const base = [...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)), 0, 0, 0, 1];
  const digito = (numeros: number[]) => {
    const soma = numeros.reduce((total, n, i) => total + n * (((numeros.length - i - 1) % 8) + 2), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join('');
}

/** fetch mínimo sobre o http do Node, só com o que o cliente do app usa (método, cabeçalhos, corpo, cancelamento). */
function fetchNode(url: string, opcoes: RequestInit = {}): Promise<Pick<Response, 'ok' | 'status' | 'text'>> {
  const modulo: typeof import('node:http') = require(url.startsWith('https:') ? 'node:https' : 'node:http');
  return new Promise((resolver, rejeitar) => {
    const requisicao = modulo.request(url, { method: opcoes.method ?? 'GET', headers: opcoes.headers as Record<string, string> }, (resposta) => {
      let corpo = '';
      resposta.setEncoding('utf8');
      resposta.on('data', (parte: string) => (corpo += parte));
      resposta.on('end', () => {
        const status = resposta.statusCode ?? 0;
        resolver({ ok: status >= 200 && status < 300, status, text: async () => corpo });
      });
    });
    requisicao.on('error', rejeitar);
    opcoes.signal?.addEventListener('abort', () => requisicao.destroy(new Error('cancelada')));
    if (typeof opcoes.body === 'string') {
      requisicao.write(opcoes.body);
    }
    requisicao.end();
  });
}
