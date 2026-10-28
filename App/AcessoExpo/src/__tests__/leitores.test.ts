import * as leitores from '../api/leitores';
import { resolverUrl } from '../servicos/config';

const AGORA = Date.parse('2026-10-27T12:00:00Z');

describe('leitores das respostas da API', () => {
  test('GET /vagas: rótulos crus, salário em reais e nome fantasia da empresa', () => {
    const [vaga] = leitores.vagas(
      {
        vagas: [
          {
            id: 12,
            titulo: 'Analista de dados',
            modalidade: 'hibrido',
            contrato: 'clt',
            publicoAlvo: 'pcd',
            cidade: 'Recife',
            estado: 'PE',
            status: 'aberta',
            salario: '4200.00',
            recursosAcessibilidade: ['interprete_libras', 7, null],
            totalCandidaturas: '3',
            criadoEm: '2026-10-26T11:00:00Z',
            empresa: { nomeFantasia: '', razaoSocial: 'Inclusiva Ltda', empresaVerificada: true, usuarioId: 40, logo: '/uploads/logo.png' },
          },
        ],
      },
      AGORA,
    );
    expect(vaga).toMatchObject({
      id: '12',
      salario: 'R$ 4.200,00',
      recursosAcessibilidade: ['interprete_libras'],
      totalCandidaturas: 3,
      nomeEmpresa: 'Inclusiva Ltda',
      empresaVerificada: true,
      empresaUsuarioId: '40',
      quando: 'ontem',
    });
  });

  test('GET /vagas/:id sem "vaga" devolve null; lista ausente vira vazia', () => {
    expect(leitores.vagaDetalhe({})).toBeNull();
    expect(leitores.vagas({ vagas: null })).toEqual([]);
  });

  test('GET /postagens: só anexos de imagem com URL; autor e curtidas', () => {
    const [publicacao] = leitores.publicacoes(
      {
        postagens: [
          {
            id: 'p1',
            conteudo: 'Olá!',
            criadoEm: '2026-10-27T10:00:00Z',
            totalCurtidas: 2,
            totalComentarios: 1,
            curtidoPorMim: true,
            editadoEm: '2026-10-27T11:00:00Z',
            anexos: [
              { id: 'a1', tipo: 'imagem', url: '/uploads/foto.jpg', descricao: 'Equipe reunida' },
              { id: 'a2', tipo: 'video', url: '/uploads/v.mp4' },
              { id: 'a3', tipo: 'imagem', url: '' },
            ],
            usuario: { id: 5, nome: 'Ana Souza', tipoUsuario: 'candidato', fotoPerfil: null },
          },
        ],
      },
      AGORA,
    );
    expect(publicacao).toMatchObject({ curtidas: 2, comentarios: 1, curtidoPorMim: true, editada: true, nomeAutor: 'Ana Souza', quando: 'há 2 horas' });
    expect(publicacao.anexos).toEqual([{ id: 'a1', url: '/uploads/foto.jpg', descricao: 'Equipe reunida' }]);
    expect(leitores.curtida({ curtido: false, totalCurtidas: 1 })).toEqual({ curtido: false, total: 1 });
  });

  test('perfil de pessoa: currículo com períodos e competências', () => {
    const perfil = leitores.perfil(
      {
        candidato: {
          usuarioId: 5,
          tituloProfissional: 'Desenvolvedora',
          cidade: 'Recife',
          estado: 'PE',
          biografia: 'Sobre mim',
          usuario: { id: 5, nome: 'Ana Souza', fotoPerfil: '/uploads/a.jpg' },
          experiencias: [{ cargo: 'Dev', empresa: 'X', local: 'Remoto', dataInicio: '2020-03-01', atual: true }],
          formacoes: [{ curso: 'ADS', instituicao: 'IF', dataInicio: '2018-02-01', dataFim: '2020-12-01' }],
          habilidades: [{ nome: ' React ' }, { nome: '' }],
          cpf: '00000000000',
        },
      },
      false,
    );
    expect(perfil).toMatchObject({
      tipo: 'candidato',
      usuarioId: '5',
      nome: 'Ana Souza',
      detalhe: 'Desenvolvedora · Recife - PE',
      habilidades: ['React'],
    });
    expect(perfil.experiencias[0]).toEqual({ titulo: 'Dev', subtitulo: 'X · Remoto', periodo: 'mar/2020 – atual', descricao: null });
    expect(perfil.formacoes[0].periodo).toBe('fev/2018 – dez/2020');
    expect(JSON.stringify(perfil)).not.toContain('00000000000');
  });

  test('perfil de empresa e painel', () => {
    const perfil = leitores.perfil(
      { empresa: { usuarioId: 9, razaoSocial: 'Inclusiva Ltda', setor: 'Tecnologia', statusAprovacao: 'aprovada', porte: 'pequena', vagas: [{ id: 1, titulo: 'Dev' }] } },
      true,
    );
    expect(perfil).toMatchObject({ tipo: 'empresa', nome: 'Inclusiva Ltda', detalhe: 'Tecnologia', statusEmpresa: 'aprovada' });
    expect(perfil.vagasAbertas[0]).toMatchObject({ titulo: 'Dev', nomeEmpresa: 'Inclusiva Ltda', empresaUsuarioId: '9' });

    const resumo = leitores.resumoEmpresa({ metricas: { vagas: 4, vagasAbertas: 2, candidaturas: 10, seguidores: 3 } }, { vagas: [] });
    expect(resumo).toEqual({ vagasPublicadas: 4, vagasAbertas: 2, candidaturas: 10, seguidores: 3, vagas: [] });
  });

  test('candidaturas e notificações', () => {
    const [candidatura] = leitores.candidaturas(
      { candidaturas: [{ id: 3, status: 'em_analise', criadoEm: '2026-10-27T11:00:00Z', vaga: { id: 12, titulo: 'Dev', empresa: { nomeFantasia: 'Inclusiva' } } }] },
      AGORA,
    );
    expect(candidatura).toEqual({ id: '3', status: 'em_analise', quando: 'há 1 hora', vagaId: '12', tituloVaga: 'Dev', nomeEmpresa: 'Inclusiva' });

    const [notificacao] = leitores.notificacoes({ notificacoes: [{ id: 1, titulo: 'Nova candidatura', lida: false, entidadeTipo: 'vaga', entidadeId: 12, ator: { nome: 'Ana' } }] });
    expect(notificacao).toMatchObject({ id: '1', lida: false, entidadeTipo: 'vaga', entidadeId: '12', atorNome: 'Ana' });
  });

  test('endereços de arquivos: "/uploads/..." ganha a origem da API', () => {
    expect(resolverUrl('/uploads/a.jpg', 'https://acesso-backend.onrender.com/api')).toBe('https://acesso-backend.onrender.com/uploads/a.jpg');
    expect(resolverUrl('https://cdn.exemplo.com/a.jpg')).toBe('https://cdn.exemplo.com/a.jpg');
    expect(resolverUrl(null)).toBeNull();
  });
});
