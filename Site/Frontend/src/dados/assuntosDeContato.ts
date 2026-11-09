import type { ChaveBase } from "@/i18n/dicionarios";
/**
 * Fale conosco: assuntos, limites e o e-mail de contato.
 *
 * As chaves de `ASSUNTOS_DE_CONTATO` são as que a API aceita (`Backend/src/config/contato.js`); um teste confere que
 * as listas e os limites não divergem.
 */
export const ASSUNTOS_DE_CONTATO = {
  duvida: "faleConosco.assunto.duvida",
  conta: "faleConosco.assunto.conta",
  problema_tecnico: "faleConosco.assunto.problemaTecnico",
  acessibilidade: "faleConosco.assunto.acessibilidade",
  privacidade: "faleConosco.assunto.privacidade",
  denuncia: "faleConosco.assunto.denuncia",
  sugestao: "faleConosco.assunto.sugestao",
  outro: "faleConosco.assunto.outro",
} as const satisfies Record<string, ChaveBase>;

export type AssuntoDeContato = keyof typeof ASSUNTOS_DE_CONTATO;

export const LIMITES_DE_CONTATO = {
  mensagemMinimo: 10,
  mensagemMaximo: 3000,
  emailMaximo: 150,
} as const;

/**
 * O e-mail de contato publicado nos Termos de Uso e no Aviso de Privacidade. É a alternativa quando o formulário
 * não está disponível (por exemplo, quando o envio de e-mails ainda não foi configurado no servidor).
 */
export const EMAIL_DE_CONTATO = "projetoacessoinclusivo@gmail.com";
