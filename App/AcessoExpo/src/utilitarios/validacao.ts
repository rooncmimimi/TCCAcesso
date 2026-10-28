/**
 * Validações dos formulários, com as mesmas regras e mensagens do app Android (Validador.java) e da
 * API (autenticacaoValidator.js). Cada função devolve a mensagem de erro, ou null quando está certo.
 */

export const TAMANHO_MINIMO_SENHA = 8;
export const TAMANHO_MAXIMO_SENHA = 72;
export const TAMANHO_MAXIMO_PUBLICACAO = 3000;

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const PADRAO_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function estaVazio(valor: string | null | undefined): boolean {
  return !valor || valor.trim() === '';
}

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

export function validarEmail(email: string): string | null {
  if (estaVazio(email)) {
    return 'Informe seu e-mail.';
  }
  return PADRAO_EMAIL.test(email.trim()) ? null : 'Digite um e-mail válido, por exemplo: nome@email.com';
}

/** No login basta a senha não estar vazia. */
export function validarSenhaLogin(senha: string): string | null {
  return senha ? null : 'Informe sua senha.';
}

/** Cadastro: 8 a 72 caracteres, com letra minúscula, maiúscula, número e símbolo (regrasSenha da API). */
export function validarNovaSenha(senha: string): string | null {
  if (!senha) {
    return 'Crie uma senha.';
  }
  if (senha.length < TAMANHO_MINIMO_SENHA || senha.length > TAMANHO_MAXIMO_SENHA) {
    return `A senha deve ter entre ${TAMANHO_MINIMO_SENHA} e ${TAMANHO_MAXIMO_SENHA} caracteres.`;
  }
  let minuscula = false;
  let maiuscula = false;
  let numero = false;
  let simbolo = false;
  for (const caractere of senha) {
    if (caractere >= 'a' && caractere <= 'z') minuscula = true;
    else if (caractere >= 'A' && caractere <= 'Z') maiuscula = true;
    else if (caractere >= '0' && caractere <= '9') numero = true;
    else simbolo = true;
  }
  if (!minuscula) return 'A senha deve conter ao menos uma letra minúscula.';
  if (!maiuscula) return 'A senha deve conter ao menos uma letra maiúscula.';
  if (!numero) return 'A senha deve conter ao menos um número.';
  if (!simbolo) return 'A senha deve conter ao menos um caractere especial (ex.: @, #, !).';
  return null;
}

export function validarConfirmacaoSenha(senha: string, confirmacao: string): string | null {
  if (!confirmacao) {
    return 'Repita a senha para confirmar.';
  }
  return confirmacao === senha ? null : 'As senhas não são iguais.';
}

/** Código de confirmação de e-mail: exatamente 6 dígitos. */
export function validarCodigoEmail(codigo: string): string | null {
  if (estaVazio(codigo)) {
    return 'Digite o código que enviamos para o seu e-mail.';
  }
  return /^\d{6}$/.test(codigo.trim()) ? null : 'O código deve ter 6 dígitos.';
}

export function validarNome(nome: string): string | null {
  if (estaVazio(nome)) {
    return 'Informe seu nome completo.';
  }
  const limpo = nome.trim();
  if (limpo.length < 3 || !limpo.includes(' ')) {
    return 'Informe nome e sobrenome.';
  }
  return limpo.length > 120 ? 'O nome pode ter no máximo 120 caracteres.' : null;
}

/** Mesmo intervalo da API: 2 a 100 caracteres. */
export function validarCidade(cidade: string): string | null {
  if (estaVazio(cidade) || cidade.trim().length < 2) {
    return 'Informe a cidade onde você mora.';
  }
  return cidade.trim().length > 100 ? 'A cidade pode ter no máximo 100 caracteres.' : null;
}

export function validarTelefoneObrigatorio(telefone: string): string | null {
  if (estaVazio(telefone)) {
    return 'Informe seu telefone com DDD.';
  }
  const digitos = somenteDigitos(telefone).length;
  return digitos === 10 || digitos === 11 ? null : 'Informe o telefone com DDD, por exemplo: (11) 98765-4321';
}

export function validarCpfObrigatorio(cpf: string): string | null {
  if (estaVazio(cpf)) {
    return 'Informe seu CPF.';
  }
  return digitosVerificadoresValidos(somenteDigitos(cpf), 11) ? null : 'Informe um CPF válido.';
}

export function validarUfObrigatoria(uf: string): string | null {
  if (estaVazio(uf)) {
    return 'Informe o estado (UF), por exemplo: SP';
  }
  const sigla = uf.trim().toUpperCase();
  return UFS.includes(sigla) ? null : 'Informe a UF com 2 letras, por exemplo: SP';
}

/** Obrigatória no cadastro de pessoa; dd/mm/aaaa, 14 anos ou mais. */
export function validarDataNascimento(texto: string, hoje: Date = new Date()): string | null {
  if (estaVazio(texto)) {
    return 'Informe sua data de nascimento.';
  }
  const data = converterDataBrasileira(texto);
  if (!data) {
    return 'Use o formato dia/mês/ano, por exemplo: 25/09/2000';
  }
  const limiteIdade = somarAnos(hoje, -14);
  if (compararDias(data, limiteIdade) > 0) {
    return 'É preciso ter pelo menos 14 anos para usar o ACESSO.';
  }
  if (compararDias(data, somarAnos(hoje, -120)) < 0) {
    return 'Confira o ano de nascimento.';
  }
  return null;
}

export function validarAceiteTermos(aceitou: boolean): string | null {
  return aceitou ? null : 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.';
}

export function validarPublicacao(conteudo: string): string | null {
  if (estaVazio(conteudo)) {
    return 'Escreva algo para publicar.';
  }
  return conteudo.trim().length <= TAMANHO_MAXIMO_PUBLICACAO
    ? null
    : `A publicação pode ter no máximo ${TAMANHO_MAXIMO_PUBLICACAO} caracteres.`;
}

/** "25/09/2000" → { ano, mes, dia }, ou null se a data não existir (ex.: 31/02). */
export function converterDataBrasileira(texto: string): { ano: number; mes: number; dia: number } | null {
  const partes = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) {
    return null;
  }
  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const ano = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null;
  }
  return { ano, mes, dia };
}

/** "25/09/2000" → "2000-09-25" (formato que a API recebe), ou null se inválida. */
export function dataBrasileiraParaIso(texto: string): string | null {
  const data = converterDataBrasileira(texto);
  if (!data) {
    return null;
  }
  return `${data.ano}-${String(data.mes).padStart(2, '0')}-${String(data.dia).padStart(2, '0')}`;
}

/** Confere os dígitos verificadores de CPF (11) ou CNPJ (14). Sequências repetidas são inválidas. */
export function digitosVerificadoresValidos(digitos: string, tamanho: 11 | 14): boolean {
  if (digitos.length !== tamanho || /^(\d)\1*$/.test(digitos)) {
    return false;
  }
  return (
    Number(digitos[tamanho - 2]) === digitoVerificador(digitos, tamanho - 2) &&
    Number(digitos[tamanho - 1]) === digitoVerificador(digitos, tamanho - 1)
  );
}

function digitoVerificador(digitos: string, quantidade: number): number {
  let soma = 0;
  for (let i = 0; i < quantidade; i++) {
    const peso = digitos.length === 11 ? quantidade + 1 - i : ((quantidade - i - 1) % 8) + 2;
    soma += Number(digitos[i]) * peso;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

type Dia = { ano: number; mes: number; dia: number };

function somarAnos(data: Date, anos: number): Dia {
  // 29/02 menos N anos cai em 28/02 quando o ano não é bissexto (como o LocalDate do Android).
  const ano = data.getFullYear() + anos;
  const mes = data.getMonth() + 1;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return { ano, mes, dia: Math.min(data.getDate(), ultimoDia) };
}

function compararDias(a: Dia, b: Dia): number {
  return a.ano - b.ano || a.mes - b.mes || a.dia - b.dia;
}
