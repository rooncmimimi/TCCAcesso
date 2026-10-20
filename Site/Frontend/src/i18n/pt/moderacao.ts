/** Denúncias e bloqueio na hora de denunciar. */
export const moderacao = {
  motivos: {
    spam: "Spam",
    conteudo_ofensivo: "Conteúdo ofensivo",
    discurso_odio: "Discurso de ódio",
    assedio: "Assédio",
    fraude: "Fraude",
    informacao_falsa: "Informação falsa",
    conteudo_inadequado: "Conteúdo inadequado",
    outro: "Outro",
  },
  denunciar: {
    titulo: (nome: string) => `Denunciar${nome ? ` "${nome}"` : ""}`,
    descricao:
      "Conte para a moderação o que está errado. Denúncias falsas ou repetidas podem limitar o seu acesso a esta função.",
    motivo: "Motivo",
    motivoEscolha: "Selecione um motivo",
    descricaoLabel: "Descrição (opcional)",
    descricaoPlaceholder: "Detalhe o que aconteceu, se quiser.",
    enviar: "Enviar denúncia",
    enviada: "Denúncia enviada. Nossa equipe vai analisar.",
    erroEnviar: "Não foi possível enviar a denúncia.",
    bloquearTitulo: (nome: string) => `Bloquear${nome ? ` ${nome}` : " este usuário"}?`,
    bloquearTexto: (nome: string) =>
      `${nome || "Esta pessoa"} não vai mais conseguir ver seu perfil, seguir você ou enviar mensagens — e o mesmo vale para você. Você pode desbloquear depois em Configurações → Privacidade.`,
    naoObrigado: "Não, obrigado",
    bloquear: "Bloquear",
    bloqueado: (nome: string) => (nome ? `${nome} foi bloqueado(a).` : "Usuário bloqueado."),
    erroBloquear: "Não foi possível bloquear este usuário.",
  },
};
