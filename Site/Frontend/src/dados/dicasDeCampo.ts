import { tx } from "@/i18n/frases";

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
    get orientacao() { return tx("Diga em poucas palavras a função que você faz ou quer fazer."); },
    get passos() { return [tx("Use o nome do cargo ou da área."), tx("Prefira o nome que as empresas usam nas vagas.")]; },
    get exemplo() { return tx("Assistente administrativo"); },
  },
  biografia: {
    get orientacao() { return tx("Conte, com suas palavras, quem você é profissionalmente. Duas ou três frases bastam."); },
    get passos() { return [tx("O que você faz ou já fez."), tx("O que sabe fazer bem."), tx("O que busca agora.")]; },
    get exemplo() { return tx("Trabalho há 8 anos com atendimento e organização de documentos. Sou cuidadosa com prazos e gosto de aprender ferramentas novas. Busco uma vaga administrativa em São Paulo."); },
  },
  experienciaDescricao: {
    get orientacao() { return tx("Conte o que você fazia nesse trabalho no dia a dia."); },
    get passos() { return [tx("Onde trabalhou e qual era a sua função."), tx("As tarefas principais, uma por frase."), tx("Um resultado, se tiver, como 'atendi 30 pessoas por dia'.")]; },
    get exemplo() { return tx("Atendia clientes no balcão e por telefone. Organizava os arquivos do setor e conferia as notas fiscais. Aprendi a usar planilhas."); },
  },
  formacaoDescricao: {
    get orientacao() { return tx("Conte o que você estudou ou aprendeu nesse curso."); },
    get passos() { return [tx("O assunto principal do curso."), tx("O que você sabe fazer por causa dele."), tx("Trabalhos ou projetos, se houver.")]; },
    get exemplo() { return tx("Curso técnico em administração, com aulas de contabilidade básica, atendimento e uso de planilhas."); },
  },
  vagaDescricao: {
    get orientacao() { return tx("Explique o que a pessoa vai fazer e como é o dia a dia, em frases curtas e sem siglas que só a empresa conhece."); },
    get passos() { return [tx("O que a pessoa vai fazer, uma tarefa por frase."), tx("Com quem vai trabalhar."), tx("Onde e em que horário trabalha.")]; },
    get exemplo() { return tx("A pessoa atende clientes por telefone e e-mail, registra os pedidos no sistema e organiza os documentos do setor. Trabalha com uma equipe de cinco pessoas, de segunda a sexta, das 9h às 17h."); },
  },
  vagaRequisitos: {
    get orientacao() { return tx("Liste só o que a pessoa precisa saber ou ter para começar. O que se aprende no trabalho não é requisito."); },
    get passos() { return [tx("Um requisito por linha."), tx("Separe o que é obrigatório do que é desejável."), tx("Evite exigir experiência ou diploma sem necessidade.")]; },
    get exemplo() { return tx("Obrigatório: ensino médio completo; saber escrever e-mails. Desejável: conhecer planilhas."); },
  },
  vagaBeneficios: {
    get orientacao() { return tx("Diga o que a empresa oferece além do salário, com valores quando houver."); },
    get passos() { return [tx("Um benefício por linha."), tx("Valores ou regras, se existirem."), tx("Não escreva o que a empresa não oferece.")]; },
    get exemplo() { return tx("Vale-transporte; vale-refeição de R$ 30 por dia; plano de saúde depois de 3 meses."); },
  },
  vagaAcessibilidade: {
    get orientacao() { return tx("Conte o que o local e o trabalho já têm de adaptação, para a pessoa saber o que esperar. Só escreva o que de fato existe."); },
    get passos() { return [tx("O acesso ao prédio e ao banheiro."), tx("Equipamentos e programas adaptados."), tx("Horários flexíveis ou trabalho remoto, se houver.")]; },
    get exemplo() { return tx("Prédio com rampa e elevador. Computadores com leitor de tela instalado. Entrada flexível entre 8h e 10h."); },
  },
  vagaAtividades: {
    get orientacao() { return tx("Liste o que a pessoa vai fazer no dia a dia, uma tarefa por linha."); },
    get passos() { return [tx("Comece cada linha por um verbo, como atender, registrar, organizar."), tx("Cite a ferramenta, se importar (planilha, sistema, telefone)."), tx("Deixe a descrição geral para o contexto.")]; },
    get exemplo() { return tx("Atender clientes por telefone e e-mail\nRegistrar os pedidos no sistema\nOrganizar os documentos do setor"); },
  },
  vagaRequisitosDesejaveis: {
    get orientacao() { return tx("Coloque aqui o que seria um diferencial, mas que a pessoa pode aprender no trabalho."); },
    get passos() { return [tx("Tudo o que não for indispensável vai aqui."), tx("Assim ninguém desiste de se candidatar por não ter algo que não era obrigatório.")]; },
    get exemplo() { return tx("Inglês básico; Conhecimento de planilhas; Experiência anterior com atendimento"); },
  },
  vagaEtapas: {
    get orientacao() { return tx("Conte quantas etapas tem o processo e o que acontece em cada uma. Quem se candidata se sente mais seguro sabendo o caminho."); },
    get passos() { return [tx("Uma etapa por linha, na ordem."), tx("Diga como cada etapa acontece (mensagem, vídeo, presencial)."), tx("Informe em quanto tempo a empresa responde.")]; },
    get exemplo() { return tx("1. Conversa por mensagem (até 15 minutos)\n2. Entrevista com a gestora, por vídeo ou presencial\n3. Resposta em até 5 dias úteis"); },
  },
  empresaDescricao: {
    get orientacao() { return tx("Apresente a empresa para quem vai se candidatar, em poucas frases."); },
    get passos() { return [tx("O que a empresa faz."), tx("Há quanto tempo existe e quantas pessoas trabalham nela."), tx("Onde fica.")]; },
    get exemplo() { return tx("Somos uma loja de material de escritório, com 12 anos de mercado e 40 pessoas na equipe, em Campinas."); },
  },
  empresaCulturaInclusiva: {
    get orientacao() { return tx("Conte o que a empresa já faz pela inclusão, com ações reais. Se ainda não faz, não escreva nada: é melhor do que prometer."); },
    get passos() { return [tx("Ações já feitas, como contratações ou adaptações."), tx("Quem na equipe cuida do assunto."), tx("Como a pessoa pode pedir uma adaptação.")]; },
    get exemplo() { return tx("Temos intérprete de Libras nas reuniões gerais. Quem precisar de uma adaptação fala com o RH pelo e-mail da vaga."); },
  },
} as const satisfies Record<string, DicaDeCampo>;

export type ChaveDeDica = keyof typeof DICAS_DE_CAMPO;
