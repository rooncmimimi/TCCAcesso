import type { Dicionario } from "../dicionario";

export const moderacao: Dicionario["moderacao"] = {
  motivos: {
    spam: "Spam",
    conteudo_ofensivo: "Contenido ofensivo",
    discurso_odio: "Discurso de odio",
    assedio: "Acoso",
    fraude: "Fraude",
    informacao_falsa: "Información falsa",
    conteudo_inadequado: "Contenido inadecuado",
    outro: "Otro",
  },
  denunciar: {
    titulo: (nome) => `Denunciar${nome ? ` "${nome}"` : ""}`,
    descricao:
      "Cuéntale a la moderación qué está mal. Las denuncias falsas o repetidas pueden limitar tu acceso a esta función.",
    motivo: "Motivo",
    motivoEscolha: "Selecciona un motivo",
    descricaoLabel: "Descripción (opcional)",
    descricaoPlaceholder: "Detalla lo que ocurrió, si quieres.",
    enviar: "Enviar denuncia",
    enviada: "Denuncia enviada. Nuestro equipo la revisará.",
    erroEnviar: "No fue posible enviar la denuncia.",
    bloquearTitulo: (nome) => `¿Bloquear${nome ? ` a ${nome}` : " a este usuario"}?`,
    bloquearTexto: (nome) =>
      `${nome || "Esta persona"} ya no podrá ver tu perfil, seguirte ni enviarte mensajes — y lo mismo vale para ti. Puedes desbloquear después en Configuración → Privacidad.`,
    naoObrigado: "No, gracias",
    bloquear: "Bloquear",
    bloqueado: (nome) => (nome ? `${nome} fue bloqueado/a.` : "Usuario bloqueado."),
    erroBloquear: "No fue posible bloquear a este usuario.",
  },
};
