import type { Dicionario } from "../dicionario";

export const mensagens: Dicionario["mensagens"] = {
  meta: {
    titulo: "Mensajes — ACESSO",
    descricao: "Conversa en tiempo real con empresas aliadas sobre vacantes y procesos de selección inclusivos.",
    descricaoSocial: "Tus conversaciones con empresas inclusivas.",
  },
  titulo: "Mensajes",
  intro: "Conversaciones en tiempo real con empresas y candidatos.",
  selecioneConversa: "Selecciona una conversación para ver los mensajes.",
  erroEnviar: "No se pudo enviar el mensaje.",
  usuarioRemovido: "Usuario eliminado",
  lista: {
    aria: "Lista de conversaciones",
    buscar: "Buscar conversaciones",
    buscarPlaceholder: "Buscar conversaciones…",
    carregandoAria: "Cargando conversaciones",
    erroTitulo: "No se pudieron cargar las conversaciones",
    erroPadrao: "Inténtalo de nuevo en unos instantes.",
    vazio: "Aún no tienes conversaciones. Postúlate a una vacante para empezar a conversar con empresas.",
    semResultado: "No se encontraron conversaciones para esta búsqueda.",
    semMensagens: "Aún no hay mensajes",
    naoLidas: (n) => `${n} ${n === 1 ? "mensaje no leído" : "mensajes no leídos"}`,
  },
  janela: {
    conversaCom: (nome) => `Conversación con ${nome}`,
    verPerfilDe: (nome) => `Ver el perfil de ${nome}`,
    digitando: "escribiendo…",
    erroTitulo: "No se pudieron cargar los mensajes",
    erroPadrao: "Inténtalo de nuevo en unos instantes.",
    vazio: (nome) => `Aún no hay mensajes. Envía el primer mensaje a ${nome}.`,
    semParticipante: "Esta conversación ya no admite mensajes nuevos porque el otro usuario fue eliminado.",
    escreva: "Escribe un mensaje",
    escrevaPlaceholder: "Escribe un mensaje…",
    enviar: "Enviar mensaje",
  },
  bolha: {
    maisOpcoes: "Más opciones del mensaje",
    denunciar: "Denunciar mensaje",
    lida: "Mensaje leído",
    enviada: "Mensaje enviado",
  },
};
