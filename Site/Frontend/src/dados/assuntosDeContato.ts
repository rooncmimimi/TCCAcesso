/**
 * Fale conosco: assuntos, limites e o e-mail de contato.
 *
 * As chaves de `ASSUNTOS_DE_CONTATO` são as que a API aceita (`Backend/src/config/contato.js`); um teste confere que
 * as listas e os limites não divergem.
 */
export const ASSUNTOS_DE_CONTATO = {
  duvida: "Dúvida sobre a plataforma",
  conta: "Minha conta",
  problema_tecnico: "Problema técnico",
  acessibilidade: "Acessibilidade",
  privacidade: "Privacidade e dados pessoais (LGPD)",
  denuncia: "Denúncia ou conteúdo inadequado",
  sugestao: "Sugestão",
  outro: "Outro assunto",
} as const;

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
