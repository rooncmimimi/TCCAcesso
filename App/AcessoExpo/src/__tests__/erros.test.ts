import { CodigosErro, FalhaApi, MensagensErro, encerraSessao, traduzirErroApi } from '../servicos/erros';

describe('traduzirErroApi (igual ao TradutorErrosApi do Android)', () => {
  test('422 com erros por campo: mensagem geral e a primeira mensagem de cada campo', () => {
    const falha = traduzirErroApi(422, {
      sucesso: false,
      mensagem: 'Erro de validação.',
      erros: [
        { campo: 'cpf', mensagem: 'CPF inválido.' },
        { campo: 'cpf', mensagem: 'Outra regra.' },
        { campo: 'email', mensagem: 'E-mail já cadastrado.' },
      ],
    });
    expect(falha.message).toBe(MensagensErro.CAMPOS);
    expect(falha.campos).toEqual({ cpf: 'CPF inválido.', email: 'E-mail já cadastrado.' });
  });

  test('mensagem da API é usada como está; código de detalhes é lido', () => {
    const falha = traduzirErroApi(403, { mensagem: 'Conta bloqueada pela moderação.', detalhes: { codigo: 'CONTA_BLOQUEADA' } });
    expect(falha.message).toBe('Conta bloqueada pela moderação.');
    expect(falha.codigo).toBe(CodigosErro.CONTA_BLOQUEADA);
    expect(falha.status).toBe(403);
  });

  test('429, 5xx e corpo que não é JSON', () => {
    expect(traduzirErroApi(429, { mensagem: 'x' }).message).toBe(MensagensErro.MUITAS_TENTATIVAS);
    expect(traduzirErroApi(500, { mensagem: 'Erro ao consultar o banco de dados.' }).message).toBe(MensagensErro.SERVICO_INDISPONIVEL);
    expect(traduzirErroApi(401, null).message).toBe(MensagensErro.SESSAO_EXPIRADA);
    expect(traduzirErroApi(404, '<html>').message).toBe(MensagensErro.ERRO_GENERICO);
  });

  test('códigos que encerram a sessão', () => {
    expect(encerraSessao('SESSAO_EXPIRADA')).toBe(true);
    expect(encerraSessao('SENHA_ALTERADA')).toBe(true);
    expect(encerraSessao(null)).toBe(false);
    expect(new FalhaApi('x')).toBeInstanceOf(Error);
  });
});
