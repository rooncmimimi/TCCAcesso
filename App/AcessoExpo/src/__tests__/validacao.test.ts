import {
  dataBrasileiraParaIso,
  digitosVerificadoresValidos,
  validarCodigoEmail,
  validarComentario,
  validarDescricaoVaga,
  validarSite,
  validarTamanhoMaximo,
  validarTituloVaga,
  validarUf,
  validarCpfObrigatorio,
  validarDataNascimento,
  validarEmail,
  validarNome,
  validarNovaSenha,
  validarTelefoneObrigatorio,
  validarUfObrigatoria,
} from '../utilitarios/validacao';

describe('validacao (mesmas regras do Validador.java e da API)', () => {
  test('e-mail', () => {
    expect(validarEmail('')).toBe('Informe seu e-mail.');
    expect(validarEmail('ana@')).toMatch(/e-mail válido/);
    expect(validarEmail(' ana@exemplo.com ')).toBeNull();
  });

  test('senha nova exige 8–72 caracteres com minúscula, maiúscula, número e símbolo', () => {
    expect(validarNovaSenha('')).toBe('Crie uma senha.');
    expect(validarNovaSenha('Ab1!')).toMatch(/entre 8 e 72/);
    expect(validarNovaSenha('ABCDEFG1!')).toMatch(/minúscula/);
    expect(validarNovaSenha('abcdefg1!')).toMatch(/maiúscula/);
    expect(validarNovaSenha('Abcdefgh!')).toMatch(/número/);
    expect(validarNovaSenha('Abcdefgh1')).toMatch(/especial/);
    expect(validarNovaSenha('Abcdefg1!')).toBeNull();
    expect(validarNovaSenha('A1!' + 'a'.repeat(70))).toMatch(/entre 8 e 72/);
  });

  test('CPF confere os dígitos verificadores e recusa sequências repetidas', () => {
    expect(validarCpfObrigatorio('')).toBe('Informe seu CPF.');
    expect(validarCpfObrigatorio('529.982.247-25')).toBeNull();
    expect(validarCpfObrigatorio('529.982.247-24')).toBe('Informe um CPF válido.');
    expect(validarCpfObrigatorio('111.111.111-11')).toBe('Informe um CPF válido.');
  });

  test('CNPJ usa os pesos de CNPJ', () => {
    expect(digitosVerificadoresValidos('11222333000181', 14)).toBe(true);
    expect(digitosVerificadoresValidos('11222333000182', 14)).toBe(false);
  });

  test('nome, telefone, UF e código', () => {
    expect(validarNome('Ana')).toBe('Informe nome e sobrenome.');
    expect(validarNome('Ana Souza')).toBeNull();
    expect(validarTelefoneObrigatorio('(11) 98765-4321')).toBeNull();
    expect(validarTelefoneObrigatorio('98765-4321')).toMatch(/DDD/);
    expect(validarUfObrigatoria('sp')).toBeNull();
    expect(validarUfObrigatoria('XX')).toMatch(/UF com 2 letras/);
    expect(validarCodigoEmail('12345')).toBe('O código deve ter 6 dígitos.');
    expect(validarCodigoEmail('123456')).toBeNull();
  });

  test('comentário: não vazio e até 1000 caracteres', () => {
    expect(validarComentario('   ')).toBe('Escreva um comentário.');
    expect(validarComentario('Ótima vaga!')).toBeNull();
    expect(validarComentario('a'.repeat(1000))).toBeNull();
    expect(validarComentario('a'.repeat(1001))).toMatch(/1000/);
  });

  test('vaga, UF opcional, site e limite de texto', () => {
    expect(validarTituloVaga('Dev')).toBe('O título deve ter entre 5 e 200 caracteres.');
    expect(validarTituloVaga('Analista de dados')).toBeNull();
    expect(validarDescricaoVaga('curta')).toMatch(/entre 20 e 8000/);
    expect(validarDescricaoVaga('a'.repeat(20))).toBeNull();
    expect(validarUf('')).toBeNull();
    expect(validarUf('pe')).toBeNull();
    expect(validarUf('ZZ')).toMatch(/UF/);
    expect(validarSite('')).toBeNull();
    expect(validarSite('https://acesso.com.br/sobre')).toBeNull();
    expect(validarSite('acesso.com.br')).toMatch(/http/);
    expect(validarTamanhoMaximo('a'.repeat(151), 150)).toBe('Use no máximo 150 caracteres.');
    expect(validarTamanhoMaximo('', 150)).toBeNull();
  });

  test('data de nascimento: formato, data existente, 14 anos e limite de 120 anos', () => {
    const hoje = new Date(2026, 9, 27);
    expect(validarDataNascimento('', hoje)).toBe('Informe sua data de nascimento.');
    expect(validarDataNascimento('31/02/2000', hoje)).toMatch(/formato/);
    expect(validarDataNascimento('2000-01-01', hoje)).toMatch(/formato/);
    expect(validarDataNascimento('28/10/2012', hoje)).toMatch(/14 anos/);
    expect(validarDataNascimento('27/10/2012', hoje)).toBeNull();
    expect(validarDataNascimento('01/01/1900', hoje)).toBe('Confira o ano de nascimento.');
    expect(dataBrasileiraParaIso('05/09/2000')).toBe('2000-09-05');
    expect(dataBrasileiraParaIso('31/04/2000')).toBeNull();
  });
});
