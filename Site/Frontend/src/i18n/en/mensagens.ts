import type { Dicionario } from "../dicionario";

export const mensagens: Dicionario["mensagens"] = {
  meta: {
    titulo: "Messages — ACESSO",
    descricao: "Chat in real time with partner companies about inclusive jobs and hiring processes.",
    descricaoSocial: "Your conversations with inclusive companies.",
  },
  titulo: "Messages",
  intro: "Real-time conversations with companies and candidates.",
  selecioneConversa: "Select a conversation to see the messages.",
  erroEnviar: "We couldn't send the message.",
  usuarioRemovido: "Removed user",
  lista: {
    aria: "Conversation list",
    buscar: "Search conversations",
    buscarPlaceholder: "Search conversations…",
    carregandoAria: "Loading conversations",
    erroTitulo: "We couldn't load the conversations",
    erroPadrao: "Please try again in a moment.",
    vazio: "You don't have any conversations yet. Apply to a job to start chatting with companies.",
    semResultado: "No conversations found for this search.",
    semMensagens: "No messages yet",
    naoLidas: (n) => `${n} unread ${n === 1 ? "message" : "messages"}`,
  },
  janela: {
    conversaCom: (nome) => `Conversation with ${nome}`,
    verPerfilDe: (nome) => `View ${nome}'s profile`,
    digitando: "typing…",
    erroTitulo: "We couldn't load the messages",
    erroPadrao: "Please try again in a moment.",
    vazio: (nome) => `No messages yet. Send the first message to ${nome}.`,
    semParticipante: "This conversation no longer accepts new messages because the other user was removed.",
    escreva: "Write a message",
    escrevaPlaceholder: "Write a message…",
    enviar: "Send message",
  },
  bolha: {
    maisOpcoes: "More message options",
    denunciar: "Report message",
    lida: "Message read",
    enviada: "Message sent",
  },
};
