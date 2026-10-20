import type { Dicionario } from "../dicionario";

export const moderacao: Dicionario["moderacao"] = {
  motivos: {
    spam: "Spam",
    conteudo_ofensivo: "Offensive content",
    discurso_odio: "Hate speech",
    assedio: "Harassment",
    fraude: "Fraud",
    informacao_falsa: "False information",
    conteudo_inadequado: "Inappropriate content",
    outro: "Other",
  },
  denunciar: {
    titulo: (nome) => `Report${nome ? ` "${nome}"` : ""}`,
    descricao:
      "Tell the moderation team what is wrong. False or repeated reports may limit your access to this feature.",
    motivo: "Reason",
    motivoEscolha: "Select a reason",
    descricaoLabel: "Description (optional)",
    descricaoPlaceholder: "Give details about what happened, if you want.",
    enviar: "Send report",
    enviada: "Report sent. Our team will review it.",
    erroEnviar: "We couldn't send the report.",
    bloquearTitulo: (nome) => `Block${nome ? ` ${nome}` : " this user"}?`,
    bloquearTexto: (nome) =>
      `${nome || "This person"} will no longer be able to see your profile, follow you or send you messages — and the same goes for you. You can unblock later in Settings → Privacy.`,
    naoObrigado: "No, thanks",
    bloquear: "Block",
    bloqueado: (nome) => (nome ? `${nome} was blocked.` : "User blocked."),
    erroBloquear: "We couldn't block this user.",
  },
};
