/**
 * Validações de CPF, nome e data de nascimento no navegador, para errar antes da viagem ao servidor.
 *
 * É a mesma regra de `Backend/src/utils/validacoesPessoais.js`; os dois lados são cobertos pelos mesmos
 * vetores de teste (e há um teste de paridade que roda as duas implementações). **Quem vale é o
 * servidor**: esta cópia só avisa mais cedo, e nunca dispensa a validação de lá.
 */

/** Idade mínima para ter conta. Vem dos Termos de Uso ("16 anos ou mais"); depende de validação jurídica. */
export const IDADE_MINIMA = 16;

/**
 * Teto de plausibilidade, não regra de negócio: serve só para barrar datas digitadas errado (como o
 * ano 0001). O ACESSO atende profissionais 50+, então nenhum limite de idade exclui ninguém.
 */
export const IDADE_MAXIMA_PLAUSIVEL = 120;

export const TAMANHO_MINIMO_NOME = 3;
export const TAMANHO_MAXIMO_NOME = 150;

export function somenteDigitos(valor: string): string {
  return String(valor ?? "").replace(/\D/g, "");
}

/**
 * CPF válido: 11 dígitos, não todos iguais (`111.111.111-11` passa na conta, mas não é um CPF) e com os
 * dois dígitos verificadores corretos. Aceita pontuação; confere só os dígitos.
 */
export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digitoVerificador = (tamanho: number): number => {
    let soma = 0;

    for (let i = 0; i < tamanho; i += 1) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }

    const resto = (soma * 10) % 11;

    return resto === 10 ? 0 : resto;
  };

  return digitoVerificador(9) === Number(cpf[9]) && digitoVerificador(10) === Number(cpf[10]);
}

/**
 * Forma canônica do nome: Unicode NFC, espaços (inclusive os não separáveis) colapsados em um só e sem
 * espaço nas pontas. Não muda maiúsculas, acentos nem a grafia.
 */
export function normalizarNome(valor: string): string {
  return String(valor ?? "")
    .normalize("NFC")
    .replace(/[\s\u00a0\u2000-\u200b\u202f\u205f\u3000]+/g, " ")
    .trim();
}

/**
 * Nome de pessoa real: palavras de letras de qualquer alfabeto (com acento e marcas combinadas), cada
 * uma com ponto opcional no fim (abreviações como "Jr." e "J."), separadas por espaço, hífen ou
 * apóstrofo (reto ou tipográfico). Recusa dígitos, símbolos, emoji e pontuação repetida.
 */
const PADRAO_NOME = /^[\p{L}\p{M}]+\.?(?:[ '’ʼ-][\p{L}\p{M}]+\.?)*$/u;

export function nomeValido(valor: string): boolean {
  const nome = normalizarNome(valor);

  return nome.length >= TAMANHO_MINIMO_NOME && nome.length <= TAMANHO_MAXIMO_NOME && PADRAO_NOME.test(nome);
}

export type MotivoDataInvalida = "formato" | "inexistente" | "futura" | "menor" | "implausivel";

export type ResultadoData = { valida: true } | { valida: false; motivo: MotivoDataInvalida };

type Partes = { ano: number; mes: number; dia: number };

/** Data `AAAA-MM-DD` que existe no calendário (recusa 2026-02-30 e 2025-13-01). */
function lerDataIso(valor: string): Partes | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);

  if (!m) return null;

  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  // `setUTCFullYear` e não `Date.UTC`: este trata anos de 0 a 99 como 1900 a 1999 (o ano 0001 viraria 1901).
  const data = new Date(0);
  data.setUTCFullYear(ano, mes - 1, dia);

  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null;
  }

  return { ano, mes, dia };
}

function idadeEm(nasc: Partes, hoje: Partes): number {
  let idade = hoje.ano - nasc.ano;

  if (hoje.mes < nasc.mes || (hoje.mes === nasc.mes && hoje.dia < nasc.dia)) {
    idade -= 1;
  }

  return idade;
}

/**
 * Confere uma data de nascimento `AAAA-MM-DD`: precisa existir no calendário, não estar no futuro e
 * respeitar `IDADE_MINIMA` e `IDADE_MAXIMA_PLAUSIVEL`.
 */
export function validarDataNascimento(valor: string, hoje: Date = new Date()): ResultadoData {
  const texto = String(valor ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return { valida: false, motivo: "formato" };
  }

  const nasc = lerDataIso(texto);

  if (!nasc) {
    return { valida: false, motivo: "inexistente" };
  }

  const agora: Partes = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1, dia: hoje.getDate() };
  const chave = (p: Partes) => p.ano * 10000 + p.mes * 100 + p.dia;

  if (chave(nasc) > chave(agora)) {
    return { valida: false, motivo: "futura" };
  }

  const idade = idadeEm(nasc, agora);

  if (idade < IDADE_MINIMA) {
    return { valida: false, motivo: "menor" };
  }

  if (idade > IDADE_MAXIMA_PLAUSIVEL) {
    return { valida: false, motivo: "implausivel" };
  }

  return { valida: true };
}
