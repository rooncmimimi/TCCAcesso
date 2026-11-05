/**
 * Conteúdo do simulador de candidatura e entrevista. TUDO é fictício: a vaga, a empresa e a "pessoa"
 * dos exemplos não existem. O simulador não lê o perfil real nem cria candidatura de verdade, e nada
 * dele é enviado a empresa alguma. Escrito à mão, sem IA.
 */

export const AVISO_DE_SIMULACAO = "Isto é um treino. A vaga, a empresa e as experiências abaixo são inventadas, nada é enviado a ninguém e nenhuma candidatura de verdade é criada.";

export type Importancia = "obrigatorio" | "desejavel";

export const VAGA_FICTICIA = {
  titulo: "Assistente administrativo",
  empresa: "Papelaria Exemplo Ltda. (empresa fictícia)",
  local: "Cidade Exemplo, modalidade presencial, de segunda a sexta, das 9h às 17h",
  contrato: "CLT, com período de experiência de 90 dias",
  beneficios: "Vale-transporte e vale-refeição de R$ 30 por dia.",
  descricao:
    "Você vai atender clientes no balcão e por telefone, registrar pedidos no sistema, organizar os documentos do setor e ajudar a conferir as notas fiscais no fim do dia. Trabalha com uma equipe de cinco pessoas.",
  acessibilidade: "Prédio com rampa e banheiro acessível. Computadores com leitor de tela instalado, se você pedir.",
};

/** Requisitos da vaga fictícia, na ordem em que aparecem no texto. `correta` é a classificação que o texto da vaga sustenta. */
export const REQUISITOS_DA_VAGA: { id: string; texto: string; correta: Importancia; dica: string }[] = [
  { id: "medio", texto: "Ensino médio completo", correta: "obrigatorio", dica: "A vaga diz “é necessário ter o ensino médio completo”." },
  { id: "email", texto: "Saber escrever e-mails claros", correta: "obrigatorio", dica: "Aparece como “indispensável”: o dia a dia envolve responder clientes." },
  { id: "planilhas", texto: "Conhecer planilhas", correta: "desejavel", dica: "A vaga diz “será um diferencial”. Dá para aprender no trabalho." },
  { id: "ingles", texto: "Inglês básico", correta: "desejavel", dica: "Também é “diferencial”: a vaga não pede atendimento em inglês." },
  { id: "atendimento", texto: "Gostar de atender pessoas", correta: "obrigatorio", dica: "A principal tarefa é atender clientes, então é parte do trabalho." },
  { id: "experiencia", texto: "Já ter trabalhado com atendimento", correta: "desejavel", dica: "A vaga diz “se tiver experiência, ótimo”. Quem nunca trabalhou pode se candidatar." },
];

export const EXPERIENCIAS_FICTICIAS: { id: string; titulo: string; detalhe: string }[] = [
  { id: "lanchonete", titulo: "Atendente em lanchonete (2 anos)", detalhe: "Atendia no balcão, anotava pedidos e fechava o caixa." },
  { id: "voluntario", titulo: "Voluntária em biblioteca comunitária (1 ano)", detalhe: "Organizava os livros e cadastrava empréstimos numa planilha." },
  { id: "curso", titulo: "Curso de informática básica (3 meses)", detalhe: "Aprendeu a usar editor de texto, e-mail e planilhas." },
  { id: "jardinagem", titulo: "Ajudante de jardinagem (6 meses)", detalhe: "Cuidava de canteiros e ferramentas." },
];

export const HABILIDADES_FICTICIAS = ["Organização", "Atendimento ao cliente", "Planilhas", "Comunicação por escrito", "Trabalho em equipe", "Atenção aos detalhes", "Cuidar de ferramentas"];

export type PerguntaDeEntrevista = { id: string; pergunta: string; orientacao: string[]; exemplo: string };

export const PERGUNTAS_DE_ENTREVISTA: PerguntaDeEntrevista[] = [
  {
    id: "sobre-voce",
    pergunta: "Fale um pouco sobre você.",
    orientacao: ["Diga seu nome e o que você faz ou já fez.", "Conte uma coisa que sabe fazer bem.", "Termine dizendo o que busca agora."],
    exemplo: "Sou a Marina, trabalhei dois anos em atendimento e gosto de organizar as tarefas do dia. Sei usar planilhas e escrevo bem. Agora busco uma vaga administrativa.",
  },
  {
    id: "habilidades",
    pergunta: "Quais são as suas principais habilidades?",
    orientacao: ["Escolha duas ou três habilidades.", "Dê um exemplo de quando usou cada uma."],
    exemplo: "Minha organização: na biblioteca, cadastrei 300 livros numa planilha. Também sou paciente com as pessoas, porque atendi muitos clientes no balcão.",
  },
  {
    id: "experiencia",
    pergunta: "Conte sobre uma experiência profissional.",
    orientacao: ["Onde foi e qual era a sua função.", "O que você fazia no dia a dia.", "O que aprendeu."],
    exemplo: "Fui atendente numa lanchonete por dois anos. Anotava os pedidos, passava ao cozinheiro e fechava o caixa. Aprendi a manter a calma quando tem fila.",
  },
  {
    id: "equipe",
    pergunta: "Como você costuma trabalhar em equipe?",
    orientacao: ["Conte uma situação real, mesmo pequena.", "Diga o que você fez para ajudar."],
    exemplo: "Quando faltou uma colega, combinei com o grupo de dividir as tarefas dela. Avisei o que eu conseguia fazer e pedi ajuda no resto.",
  },
  {
    id: "interesse",
    pergunta: "Por que você se interessou por esta vaga?",
    orientacao: ["Cite algo da descrição que combina com você.", "Seja sincero(a): pode ser aprender, o horário ou o tipo de trabalho."],
    exemplo: "A vaga pede atendimento e organização, que são coisas de que gosto e já pratiquei. Também gostei do horário, que me permite estudar à noite.",
  },
  {
    id: "orientacoes",
    pergunta: "Como você prefere receber orientações no trabalho?",
    orientacao: ["Não há resposta errada: diga o que ajuda você.", "Dar um exemplo ajuda quem ouve a entender."],
    exemplo: "Prefiro receber as instruções por escrito e uma de cada vez. Se algo mudar, gosto de que me avisem por mensagem para eu conferir depois.",
  },
];

export const MODELO_DE_PEDIDO_DE_ADAPTACAO =
  "Olá! Tenho interesse na vaga e gostaria de participar do processo seletivo. Para a entrevista, preciso das perguntas por escrito, com um pouco mais de tempo para responder. Posso fazer a entrevista por mensagem?";
