import type { Dicionario } from "../dicionario";

export const importarCurriculo: Dicionario["importarCurriculo"] = {
  titulo: "Import data from resume",
  descricao:
    "Automatic keyword-based extraction, without artificial intelligence. Nothing is saved until you review and confirm.",
  extraindo: "Extracting text from the file…",
  escolher: "Click to choose a PDF or DOCX",
  avisoFormatos:
    "Old-format .doc files and scanned PDFs (images) are not supported — use a PDF with selectable text or a DOCX.",
  contatoEncontrado: "Contact found (not saved automatically):",
  email: "Email",
  telefone: "Phone",
  experienciasEncontradas: "Experiences found",
  incluirExperiencia: "Include this experience",
  cargoObrigatorio: "Job title (required)",
  empresaObrigatoria: "Company (required)",
  inicioObrigatorio: "Start date (required)",
  termino: "End date",
  empregoAtual: "Current job",
  formacoesEncontradas: "Education found",
  incluirFormacao: "Include this education entry",
  instituicaoObrigatoria: "Institution (required)",
  cursoObrigatorio: "Course (required)",
  conclusao: "Completion (or expected)",
  emAndamento: "In progress",
  habilidadesEncontradas: "Skills found",
  nadaIdentificado:
    "We couldn't identify experience, education or skills sections in this file — try a resume with more explicit section titles, or fill them in manually on your profile.",
  confirmar: "Confirm and save checked items",
  erroExtrair: "We couldn't extract the resume.",
  erroSalvar: "We couldn't save the confirmed items.",
  erroTipo: "Upload a PDF or DOCX file.",
  nadaSalvo: "Nothing was saved — check at least one item and fill in the required fields.",
  salvos: (salvos, ignorados) => {
    const adicionados = `${salvos} ${salvos === 1 ? "item" : "items"} added to your profile.`;
    return ignorados > 0
      ? `${adicionados} ${ignorados} ${ignorados === 1 ? "item was" : "items were"} skipped for missing required fields (job title/company/date or institution/course).`
      : adicionados;
  },
};
