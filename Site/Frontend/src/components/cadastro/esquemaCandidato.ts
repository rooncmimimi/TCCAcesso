import { z } from "zod";

import type { TextosCadastro } from "@/components/cadastro/idioma";
import { ehCodigoDePais } from "@/dados/paises";
import { esquemaCpf, esquemaDataNascimento, esquemaNome } from "@/components/cadastro/regrasPessoais";
import { somenteDigitos } from "@/lib/mascaras";

/**
 * Esquema do candidato montado a partir dos textos do idioma escolhido, para as mensagens de erro
 * acompanharem a tradução — errar em português numa tela em espanhol é justamente a hora em que a
 * pessoa mais precisa entender.
 *
 * **Todo campo aqui é obrigatório.** Os dois únicos opcionais do cadastro — foto de perfil e
 * currículo — não passam por este esquema; ficam na etapa 3, que tem validação própria.
 */
export function criarEsquemaCandidato(t: TextosCadastro) {
  return z.object({
    pais: z.string().trim().min(1, t.erroPais).refine(ehCodigoDePais, t.erroPaisLista),
    email: z.string().trim().min(1, t.erroEmail).email(t.erroEmailFormato).max(150),
    cpf: esquemaCpf(t),
    senha: z
      .string()
      .min(8, t.erroSenha)
      .max(72, t.erroSenha)
      .regex(/[a-z]/, t.erroSenhaMinuscula)
      .regex(/[A-Z]/, t.erroSenhaMaiuscula)
      .regex(/\d/, t.erroSenhaNumero)
      .regex(/[^A-Za-z0-9]/, t.erroSenhaEspecial),
    termos: z.literal(true, { errorMap: () => ({ message: t.erroTermos }) }),
    nome: esquemaNome(t),
    telefone: z
      .string()
      .trim()
      .min(1, t.erroTelefone)
      .refine((v) => {
        const digitos = somenteDigitos(v).length;
        return digitos >= 10 && digitos <= 11;
      }, t.erroTelefoneFormato),
    dataNascimento: esquemaDataNascimento(t),
    cidade: z.string().trim().min(2, t.erroCidade).max(100),
    estado: z.string().trim().length(2, t.erroEstado),
  });
}
