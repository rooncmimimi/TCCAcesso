/**
 * Fale conosco: os assuntos que a pessoa pode escolher e os limites do texto.
 *
 * As chaves vão no corpo da requisição e o rótulo aparece no assunto do e-mail que a equipe recebe. O Site tem
 * a mesma lista (`Frontend/src/dados/assuntosDeContato.ts`), e um teste confere que as duas não divergem.
 */
export const ASSUNTOS_DE_CONTATO = {
    duvida: "Dúvida sobre a plataforma",
    conta: "Minha conta",
    problema_tecnico: "Problema técnico",
    acessibilidade: "Acessibilidade",
    privacidade: "Privacidade e dados pessoais (LGPD)",
    denuncia: "Denúncia ou conteúdo inadequado",
    sugestao: "Sugestão",
    outro: "Outro assunto"
};

export const LIMITES_DE_CONTATO = {
    mensagemMinimo: 10,
    mensagemMaximo: 3000,
    emailMaximo: 150
};
