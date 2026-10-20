import type { Dicionario } from "../dicionario";

export const importarCurriculo: Dicionario["importarCurriculo"] = {
  titulo: "Importar datos del currículum",
  descricao:
    "Extracción automática por palabras clave, sin inteligencia artificial. No se guarda nada hasta que revises y confirmes.",
  extraindo: "Extrayendo texto del archivo…",
  escolher: "Haz clic para elegir un PDF o DOCX",
  avisoFormatos:
    "No se admiten archivos .doc (formato antiguo de Word) ni PDF escaneados (imagen) — usa un PDF con texto seleccionable o un DOCX.",
  contatoEncontrado: "Contacto encontrado (no se guarda automáticamente):",
  email: "Correo",
  telefone: "Teléfono",
  experienciasEncontradas: "Experiencias encontradas",
  incluirExperiencia: "Incluir esta experiencia",
  cargoObrigatorio: "Cargo (obligatorio)",
  empresaObrigatoria: "Empresa (obligatorio)",
  inicioObrigatorio: "Fecha de inicio (obligatorio)",
  termino: "Fecha de fin",
  empregoAtual: "Empleo actual",
  formacoesEncontradas: "Formaciones encontradas",
  incluirFormacao: "Incluir esta formación",
  instituicaoObrigatoria: "Institución (obligatorio)",
  cursoObrigatorio: "Curso (obligatorio)",
  conclusao: "Finalización (o prevista)",
  emAndamento: "En curso",
  habilidadesEncontradas: "Habilidades encontradas",
  nadaIdentificado:
    "No fue posible identificar secciones de experiencia, formación o habilidades en este archivo — prueba con un currículum con títulos de sección más explícitos, o completa manualmente en el perfil.",
  confirmar: "Confirmar y guardar los elementos marcados",
  erroExtrair: "No fue posible extraer el currículum.",
  erroSalvar: "No fue posible guardar los elementos confirmados.",
  erroTipo: "Envía un archivo PDF o DOCX.",
  nadaSalvo: "No se guardó nada — marca al menos un elemento y completa los campos obligatorios.",
  salvos: (salvos, ignorados) => {
    const adicionados = `${salvos} ${salvos === 1 ? "elemento añadido" : "elementos añadidos"} al perfil.`;
    return ignorados > 0
      ? `${adicionados} ${ignorados} ${ignorados === 1 ? "elemento se omitió" : "elementos se omitieron"} por falta de campos obligatorios (cargo/empresa/fecha o institución/curso).`
      : adicionados;
  },
};
