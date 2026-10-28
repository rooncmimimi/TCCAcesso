import { corpoRegistroPerfil, corpoVaga, type EdicaoPerfil } from '../api/conteudo';

const edicao: EdicaoPerfil = {
  tipo: 'candidato',
  usuarioId: 'u1',
  registroId: 'r1',
  nome: ' Ana Souza ',
  cidade: ' Recife ',
  estado: 'pe',
  tituloProfissional: ' Analista ',
  sobre: ' Gosto de dados ',
  setor: '',
  culturaInclusiva: '',
  site: '',
};

describe('corpos das requisições (mesmos do app Android)', () => {
  test('POST /vagas: vazios ficam de fora e a vaga nasce aberta', () => {
    expect(
      corpoVaga({ titulo: ' Analista de dados ', descricao: ' Descrição longa o bastante ', modalidade: 'remoto', contrato: 'clt', publicoAlvo: 'pcd', cidade: '', estado: '', recursosAcessibilidade: [] }),
    ).toEqual({ titulo: 'Analista de dados', descricao: 'Descrição longa o bastante', modalidade: 'remoto', contrato: 'clt', publicoAlvo: 'pcd', status: 'aberta' });
    expect(
      corpoVaga({ titulo: 'Vaga X', descricao: 'd'.repeat(20), modalidade: 'hibrido', contrato: 'pj', publicoAlvo: 'geral', cidade: ' Recife ', estado: 'pe', recursosAcessibilidade: ['interprete_libras'] }),
    ).toMatchObject({ cidade: 'Recife', estado: 'PE', recursosAcessibilidade: ['interprete_libras'] });
  });

  test('PUT /candidatos/:id: texto apagado vai como string vazia (a API ignora campo ausente)', () => {
    expect(corpoRegistroPerfil(edicao)).toEqual({ cidade: 'Recife', estado: 'PE', tituloProfissional: 'Analista', biografia: 'Gosto de dados' });
    expect(corpoRegistroPerfil({ ...edicao, tituloProfissional: '', sobre: '' })).toMatchObject({ tituloProfissional: '', biografia: '' });
  });

  test('PUT /empresas/:id: nome fantasia, e o site vazio nunca é enviado', () => {
    const empresa = { ...edicao, tipo: 'empresa' as const, setor: ' Tecnologia ', culturaInclusiva: ' Inclusiva ' };
    const corpo = corpoRegistroPerfil(empresa);
    expect(corpo).toEqual({ cidade: 'Recife', estado: 'PE', nomeFantasia: 'Ana Souza', setor: 'Tecnologia', descricao: 'Gosto de dados', culturaInclusiva: 'Inclusiva' });
    expect(corpo).not.toHaveProperty('site');
    expect(corpoRegistroPerfil({ ...empresa, site: ' https://acesso.com.br ' })).toMatchObject({ site: 'https://acesso.com.br' });
  });
});
