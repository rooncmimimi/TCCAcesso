/**
 * Orientações do assistente de preenchimento: o que escrever em campos de texto livre que costumam
 * deixar a pessoa em dúvida. Escritas à mão. O exemplo é só uma ilustração com dados inventados, e
 * **nunca** é colocado no campo: quem escreve é a pessoa.
 */

export type DicaDeCampo = {
  /** O que o campo pede, em uma frase. */
  orientacao: string;
  /** Roteiro curto do que vale contar. */
  passos: string[];
  /** Exemplo com dados fictícios, só para mostrar o jeito de escrever. */
  exemplo: string;
};

export const DICAS_DE_CAMPO = {
  tituloProfissional: {
    orientacao: "Diga em poucas palavras a função que você faz ou quer fazer.",
    passos: ["Use o nome do cargo ou da área.", "Prefira o nome que as empresas usam nas vagas."],
    exemplo: "Assistente administrativo",
  },
  biografia: {
    orientacao: "Conte, com suas palavras, quem você é profissionalmente. Duas ou três frases bastam.",
    passos: ["O que você faz ou já fez.", "O que sabe fazer bem.", "O que busca agora."],
    exemplo: "Trabalho há 8 anos com atendimento e organização de documentos. Sou cuidadosa com prazos e gosto de aprender ferramentas novas. Busco uma vaga administrativa em São Paulo.",
  },
  experienciaDescricao: {
    orientacao: "Conte o que você fazia nesse trabalho no dia a dia.",
    passos: ["Onde trabalhou e qual era a sua função.", "As tarefas principais, uma por frase.", "Um resultado, se tiver, como 'atendi 30 pessoas por dia'."],
    exemplo: "Atendia clientes no balcão e por telefone. Organizava os arquivos do setor e conferia as notas fiscais. Aprendi a usar planilhas.",
  },
  formacaoDescricao: {
    orientacao: "Conte o que você estudou ou aprendeu nesse curso.",
    passos: ["O assunto principal do curso.", "O que você sabe fazer por causa dele.", "Trabalhos ou projetos, se houver."],
    exemplo: "Curso técnico em administração, com aulas de contabilidade básica, atendimento e uso de planilhas.",
  },
} as const satisfies Record<string, DicaDeCampo>;

export type ChaveDeDica = keyof typeof DICAS_DE_CAMPO;
