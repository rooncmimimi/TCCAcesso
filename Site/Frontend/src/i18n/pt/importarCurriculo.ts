/** Importação de dados a partir do currículo. */
export const importarCurriculo = {
  titulo: "Importar dados do currículo",
  descricao:
    "Extração automática por palavras-chave, sem inteligência artificial. Nada é salvo até você revisar e confirmar.",
  extraindo: "Extraindo texto do arquivo…",
  escolher: "Clique para escolher um PDF ou DOCX",
  avisoFormatos:
    "Arquivos .doc (formato antigo do Word) e PDFs escaneados (imagem) não são suportados — use PDF com texto selecionável ou DOCX.",
  contatoEncontrado: "Contato encontrado (não é salvo automaticamente):",
  email: "E-mail",
  telefone: "Telefone",
  experienciasEncontradas: "Experiências encontradas",
  incluirExperiencia: "Incluir esta experiência",
  cargoObrigatorio: "Cargo (obrigatório)",
  empresaObrigatoria: "Empresa (obrigatório)",
  inicioObrigatorio: "Data de início (obrigatório)",
  termino: "Data de término",
  empregoAtual: "Emprego atual",
  formacoesEncontradas: "Formações encontradas",
  incluirFormacao: "Incluir esta formação",
  instituicaoObrigatoria: "Instituição (obrigatório)",
  cursoObrigatorio: "Curso (obrigatório)",
  conclusao: "Conclusão (ou prevista)",
  emAndamento: "Em andamento",
  habilidadesEncontradas: "Habilidades encontradas",
  nadaIdentificado:
    "Não foi possível identificar seções de experiência, formação ou habilidades neste arquivo — tente um currículo com esses títulos de seção mais explícitos, ou preencha manualmente no perfil.",
  confirmar: "Confirmar e salvar itens marcados",
  erroExtrair: "Não foi possível extrair o currículo.",
  erroSalvar: "Não foi possível salvar os itens confirmados.",
  erroTipo: "Envie um arquivo PDF ou DOCX.",
  nadaSalvo: "Nada foi salvo — marque ao menos um item e preencha os campos obrigatórios.",
  salvos: (salvos: number, ignorados: number) => {
    const adicionados = `${salvos} ${salvos === 1 ? "item adicionado" : "itens adicionados"} ao perfil.`;
    return ignorados > 0
      ? `${adicionados} ${ignorados} ${ignorados === 1 ? "item foi ignorado" : "itens foram ignorados"} por falta de campo obrigatório (cargo/empresa/data ou instituição/curso).`
      : adicionados;
  },
};
