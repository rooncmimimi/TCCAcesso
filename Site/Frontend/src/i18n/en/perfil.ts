import type { Dicionario } from "../dicionario";

export const perfil: Dicionario["perfil"] = {
  pessoal: {
    usuario: "User",
    editarPerfil: "Edit profile",
    adicionarTitulo: "Add professional title",
    perfilProfissional: "Professional profile",
    administrador: "ACESSO administrator",
    seguidores: "followers",
    seguindo: "following",
    sobreMim: "About me",
    preferenciasTitulo: "Accessibility preferences",
    nenhumaPreferencia: "No accessibility preference turned on.",
    ajustarPreferencias: "Adjust accessibility preferences",
    chips: {
      voz: "Voice reading",
      libras: "Libras (VLibras)",
      contraste: "High contrast",
      dislexia: "Dyslexia-friendly font",
    },
    carregandoProfissional: "Loading professional profile…",
    curriculo: "Resume",
    enviadoEm: (data) => ` · uploaded on ${data}`,
    nenhumCurriculo: "No resume uploaded yet.",
    atualizarCurriculo: "Update resume",
    enviarCurriculo: "Upload resume",
    importarDados: "Import data from resume",
    experiencia: "Work experience",
    formacao: "Education",
    habilidades: "Skills",
    certificados: "Certificates",
    publicacoes: "Posts",
    curriculoEnviado: "Resume uploaded.",
    erroEnviarCurriculo: "We couldn't upload the resume.",
    erroTipoCurriculo: "Upload a PDF, DOC or DOCX file.",
  },
  empresa: {
    carregando: "Loading company profile…",
    erroProprio: "We couldn't load your company's data. Please try again later.",
    editar: "Edit company profile",
    aprovada: "Approved",
    site: "Website",
    seguidores: (n) => `${n} followers`,
    sobre: "About the company",
    cultura: "Inclusion culture",
    vagasPublicadas: "Posted jobs",
    carregandoVagas: "Loading jobs…",
    nenhumaVaga: "No jobs posted yet.",
    localNaoInformado: "Location not provided",
  },
  aviso: {
    tituloPendente: "Your company is under review",
    tituloSuspensa: "Company account suspended",
    tituloReprovada: "Your company sign-up was not approved",
    motivo: "Reason",
    falaPendente:
      "Your company is under review. Your sign-up was received and is waiting for approval by an ACESSO administrator. You will get a notification when the review is finished.",
    falaSuspensa: (motivo) =>
      `Company account suspended. Your company was suspended by ACESSO moderation.${motivo ? ` Reason: ${motivo}` : ""}`,
    falaReprovada: (motivo) =>
      `Your company sign-up was not approved.${motivo ? ` Reason: ${motivo}` : ""}`,
    textoPendente:
      "Your sign-up was received and is waiting for approval by an ACESSO administrator. You will get a notification when the review is finished. Meanwhile, posting jobs, editing the company profile and viewing applications are unavailable.",
    textoSuspensa:
      "Your company was suspended by ACESSO moderation. While the suspension is active, access to the platform stays blocked.",
    textoReprovada:
      "The ACESSO team reviewed your sign-up and it was not approved. Company features (posting jobs, editing the profile, viewing applications) stay unavailable while this status does not change.",
  },
  bloquear: {
    maisOpcoes: "More options",
    bloquearUsuario: "Block user",
    denunciarEmpresa: "Report company",
    denunciarUsuario: "Report user",
    titulo: (nome) => `Block ${nome}?`,
    texto: (nome) =>
      `${nome} will no longer be able to see your profile, follow you or send you messages — and the same goes for you regarding ${nome}. You can unblock later in Settings → Privacy.`,
    bloqueado: (nome) => `${nome} was blocked.`,
    erro: "We couldn't block this user.",
    bloquear: "Block",
  },
};
