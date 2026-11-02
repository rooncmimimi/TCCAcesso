import { z } from "zod";

import {
  IDADE_MAXIMA_PLAUSIVEL,
  IDADE_MINIMA,
  TAMANHO_MAXIMO_NOME,
  cpfValido,
  nomeValido,
  somenteDigitos,
  validarDataNascimento,
  type MotivoDataInvalida,
} from "@/lib/validacoesPessoais";

/**
 * Esquemas Zod de nome, CPF e data de nascimento, num lugar só para o cadastro de candidato, o de
 * empresa e quem mais precisar não divergirem. As mensagens vêm de quem chama (o assistente do
 * candidato as traduz; o da empresa usa português).
 */

type MensagensNome = { erroNome: string; erroNomeCaracteres: string };
type MensagensCpf = { erroCpf: string; erroCpfFormato: string; erroCpfInvalido: string };
export type MensagensData = {
  erroDataNascimento: string;
  erroDataInexistente: string;
  erroDataFutura: string;
  erroDataMenor: string;
  erroDataImplausivel: string;
};

/** Nome de pessoa: 3 a 150 caracteres, só letras, espaço, hífen, apóstrofo e ponto (veja `nomeValido`). */
export const esquemaNome = (m: MensagensNome) =>
  z
    .string()
    .trim()
    .min(3, m.erroNome)
    .max(TAMANHO_MAXIMO_NOME, m.erroNome)
    .refine((valor) => nomeValido(valor), m.erroNomeCaracteres);

/** CPF com ou sem máscara: 11 dígitos, sem sequência repetida e com os dígitos verificadores corretos. */
export const esquemaCpf = (m: MensagensCpf) =>
  z
    .string()
    .trim()
    .min(1, m.erroCpf)
    .refine((valor) => somenteDigitos(valor).length === 11, m.erroCpfFormato)
    .refine((valor) => somenteDigitos(valor).length !== 11 || cpfValido(valor), m.erroCpfInvalido);

const CHAVE_MENSAGEM: Record<MotivoDataInvalida, keyof MensagensData> = {
  formato: "erroDataNascimento",
  inexistente: "erroDataInexistente",
  futura: "erroDataFutura",
  menor: "erroDataMenor",
  implausivel: "erroDataImplausivel",
};

/** A mensagem que explica por que a data foi recusada. */
export const mensagemDataNascimento = (m: MensagensData, motivo: MotivoDataInvalida): string =>
  m[CHAVE_MENSAGEM[motivo]];

/** Data `AAAA-MM-DD`: existe no calendário, não é futura e respeita os limites de idade. */
export const esquemaDataNascimento = (m: MensagensData) =>
  z
    .string()
    .trim()
    .min(1, m.erroDataNascimento)
    .superRefine((valor, ctx) => {
      const resultado = validarDataNascimento(valor);

      if (!resultado.valida) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: m[CHAVE_MENSAGEM[resultado.motivo]] });
      }
    });

const dois = (n: number) => String(n).padStart(2, "0");
const paraIso = (d: Date) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

/**
 * Limites para o `<input type="date">`: o seletor do navegador já não oferece datas futuras, de quem
 * teria menos de `IDADE_MINIMA` anos, nem de mais de `IDADE_MAXIMA_PLAUSIVEL`. É conforto; a validação
 * de verdade continua no esquema acima e no servidor.
 */
export function limitesDataNascimento(hoje: Date = new Date()): { min: string; max: string } {
  const max = new Date(hoje.getFullYear() - IDADE_MINIMA, hoje.getMonth(), hoje.getDate());
  const min = new Date(hoje.getFullYear() - IDADE_MAXIMA_PLAUSIVEL, hoje.getMonth(), hoje.getDate());

  return { min: paraIso(min), max: paraIso(max) };
}
