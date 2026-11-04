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
  vagaDescricao: {
    orientacao: "Explique o que a pessoa vai fazer e como é o dia a dia, em frases curtas e sem siglas que só a empresa conhece.",
    passos: ["O que a pessoa vai fazer, uma tarefa por frase.", "Com quem vai trabalhar.", "Onde e em que horário trabalha."],
    exemplo: "A pessoa atende clientes por telefone e e-mail, registra os pedidos no sistema e organiza os documentos do setor. Trabalha com uma equipe de cinco pessoas, de segunda a sexta, das 9h às 17h.",
  },
  vagaRequisitos: {
    orientacao: "Liste só o que a pessoa precisa saber ou ter para começar. O que se aprende no trabalho não é requisito.",
    passos: ["Um requisito por linha.", "Separe o que é obrigatório do que é desejável.", "Evite exigir experiência ou diploma sem necessidade."],
    exemplo: "Obrigatório: ensino médio completo; saber escrever e-mails. Desejável: conhecer planilhas.",
  },
  vagaBeneficios: {
    orientacao: "Diga o que a empresa oferece além do salário, com valores quando houver.",
    passos: ["Um benefício por linha.", "Valores ou regras, se existirem.", "Não escreva o que a empresa não oferece."],
    exemplo: "Vale-transporte; vale-refeição de R$ 30 por dia; plano de saúde depois de 3 meses.",
  },
  vagaAcessibilidade: {
    orientacao: "Conte o que o local e o trabalho já têm de adaptação, para a pessoa saber o que esperar. Só escreva o que de fato existe.",
    passos: ["O acesso ao prédio e ao banheiro.", "Equipamentos e programas adaptados.", "Horários flexíveis ou trabalho remoto, se houver."],
    exemplo: "Prédio com rampa e elevador. Computadores com leitor de tela instalado. Entrada flexível entre 8h e 10h.",
  },
  empresaDescricao: {
    orientacao: "Apresente a empresa para quem vai se candidatar, em poucas frases.",
    passos: ["O que a empresa faz.", "Há quanto tempo existe e quantas pessoas trabalham nela.", "Onde fica."],
    exemplo: "Somos uma loja de material de escritório, com 12 anos de mercado e 40 pessoas na equipe, em Campinas.",
  },
  empresaCulturaInclusiva: {
    orientacao: "Conte o que a empresa já faz pela inclusão, com ações reais. Se ainda não faz, não escreva nada: é melhor do que prometer.",
    passos: ["Ações já feitas, como contratações ou adaptações.", "Quem na equipe cuida do assunto.", "Como a pessoa pode pedir uma adaptação."],
    exemplo: "Temos intérprete de Libras nas reuniões gerais. Quem precisar de uma adaptação fala com o RH pelo e-mail da vaga.",
  },
} as const satisfies Record<string, DicaDeCampo>;

export type ChaveDeDica = keyof typeof DICAS_DE_CAMPO;
