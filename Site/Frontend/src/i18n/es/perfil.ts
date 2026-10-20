import type { Dicionario } from "../dicionario";

export const perfil: Dicionario["perfil"] = {
  pessoal: {
    usuario: "Usuario",
    editarPerfil: "Editar perfil",
    adicionarTitulo: "Añadir título profesional",
    perfilProfissional: "Perfil profesional",
    administrador: "Administrador de ACESSO",
    seguidores: "seguidores",
    seguindo: "siguiendo",
    sobreMim: "Sobre mí",
    preferenciasTitulo: "Preferencias de accesibilidad",
    nenhumaPreferencia: "Ninguna preferencia de accesibilidad activada.",
    ajustarPreferencias: "Ajustar preferencias de accesibilidad",
    chips: {
      voz: "Lectura en voz alta",
      libras: "Libras (VLibras)",
      contraste: "Alto contraste",
      dislexia: "Fuente para dislexia",
    },
    carregandoProfissional: "Cargando perfil profesional…",
    curriculo: "Currículum",
    enviadoEm: (data) => ` · enviado el ${data}`,
    nenhumCurriculo: "Aún no has enviado un currículum.",
    atualizarCurriculo: "Actualizar currículum",
    enviarCurriculo: "Enviar currículum",
    importarDados: "Importar datos del currículum",
    experiencia: "Experiencia profesional",
    formacao: "Formación académica",
    habilidades: "Habilidades",
    certificados: "Certificados",
    publicacoes: "Publicaciones",
    curriculoEnviado: "Currículum enviado.",
    erroEnviarCurriculo: "No fue posible enviar el currículum.",
    erroTipoCurriculo: "Envía un archivo PDF, DOC o DOCX.",
  },
  empresa: {
    carregando: "Cargando perfil de la empresa…",
    erroProprio: "No fue posible cargar los datos de tu empresa. Inténtalo de nuevo más tarde.",
    editar: "Editar perfil de la empresa",
    aprovada: "Aprobada",
    site: "Sitio web",
    seguidores: (n) => `${n} seguidores`,
    sobre: "Sobre la empresa",
    cultura: "Cultura de inclusión",
    vagasPublicadas: "Vacantes publicadas",
    carregandoVagas: "Cargando vacantes…",
    nenhumaVaga: "Aún no hay vacantes publicadas.",
    localNaoInformado: "Ubicación no informada",
  },
  aviso: {
    tituloPendente: "Tu empresa está en revisión",
    tituloSuspensa: "Cuenta empresarial suspendida",
    tituloReprovada: "Tu registro empresarial no fue aprobado",
    motivo: "Motivo",
    falaPendente:
      "Tu empresa está en revisión. Tu registro fue recibido y está esperando la aprobación de un administrador de ACESSO. Recibirás una notificación cuando termine la revisión.",
    falaSuspensa: (motivo) =>
      `Cuenta empresarial suspendida. Tu empresa fue suspendida por la moderación de ACESSO.${motivo ? ` Motivo: ${motivo}` : ""}`,
    falaReprovada: (motivo) =>
      `Tu registro empresarial no fue aprobado.${motivo ? ` Motivo: ${motivo}` : ""}`,
    textoPendente:
      "Tu registro fue recibido y está esperando la aprobación de un administrador de ACESSO. Recibirás una notificación cuando termine la revisión. Mientras tanto, publicar vacantes, editar el perfil de la empresa y ver postulaciones no están disponibles.",
    textoSuspensa:
      "Tu empresa fue suspendida por la moderación de ACESSO. Mientras la suspensión esté activa, el acceso a la plataforma permanece bloqueado.",
    textoReprovada:
      "El equipo de ACESSO revisó tu registro y no fue aprobado. Las funciones empresariales (publicar vacantes, editar el perfil, ver postulaciones) no están disponibles mientras este estado no cambie.",
  },
  bloquear: {
    maisOpcoes: "Más opciones",
    bloquearUsuario: "Bloquear usuario",
    denunciarEmpresa: "Denunciar empresa",
    denunciarUsuario: "Denunciar usuario",
    titulo: (nome) => `¿Bloquear a ${nome}?`,
    texto: (nome) =>
      `${nome} ya no podrá ver tu perfil, seguirte ni enviarte mensajes — y lo mismo vale para ti respecto a ${nome}. Puedes desbloquear después en Configuración → Privacidad.`,
    bloqueado: (nome) => `${nome} fue bloqueado/a.`,
    erro: "No fue posible bloquear a este usuario.",
    bloquear: "Bloquear",
  },
};
