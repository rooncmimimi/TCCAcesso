/**
 * Explicação de expressões de requisito que aparecem em vagas ("boa comunicação", "proatividade"...).
 *
 * Escrita à mão, sem IA. Cada uma diz o que costuma significar, quando é de fato necessária para a
 * função e quando pode ser só uma preferência genérica da empresa, e **mostra outras formas de
 * demonstrar a competência**. Não presume que uma competência só se prova falando, nem presencialmente,
 * nem de um jeito só: pessoas com deficiências diferentes demonstram a mesma competência de formas
 * diferentes. Nada aqui avalia a pessoa; é só ajuda para ler a vaga e decidir se candidatar.
 */

export type Competencia = {
  id: string;
  termo: string;
  /** Como o termo costuma aparecer escrito (sem acento e minúsculas na comparação). */
  variantes: string[];
  significa: string;
  necessariaQuando: string;
  preferenciaQuando: string;
  /** Formas de demonstrar, sem depender de fala ou presença. */
  outrasFormas: string[];
  /** O que você pode perguntar à empresa. */
  perguntar: string;
};

export const COMPETENCIAS: readonly Competencia[] = [
  {
    id: "comunicacao",
    termo: "Boa comunicação",
    variantes: ["boa comunicação", "comunicação eficaz", "comunicação clara", "boa comunicacao", "comunicativo", "comunicativa"],
    significa: "Conseguir passar e receber informações de forma que os outros entendam. Pode ser por escrito, em Libras, por fala, por imagens ou por outros recursos.",
    necessariaQuando: "O trabalho depende de trocar informações o tempo todo, como atendimento ao cliente ou coordenação de equipe.",
    preferenciaQuando: "A vaga não diz com quem nem como a pessoa vai se comunicar. Aí pode ser uma frase pronta, e vale perguntar.",
    outrasFormas: ["Mensagens e e-mails claros", "Comunicação em Libras, com ou sem intérprete", "Apresentações por escrito ou com imagens", "Comunicação alternativa, como cartões e aplicativos"],
    perguntar: "Como a comunicação acontece no dia a dia desta função: por escrito, por voz, por chat? Posso me comunicar do jeito que funciona melhor para mim?",
  },
  {
    id: "flexibilidade",
    termo: "Flexibilidade",
    variantes: ["flexibilidade", "flexível", "jogo de cintura", "adaptabilidade"],
    significa: "Ajustar-se quando o plano muda, por exemplo uma tarefa nova ou um horário diferente.",
    necessariaQuando: "O trabalho muda de prioridade com frequência e a vaga diz que mudanças de horário ou de tarefa são comuns.",
    preferenciaQuando: "Aparece sem exemplo. Pode esconder a expectativa de trabalhar além do combinado: vale perguntar o que muda e com que aviso.",
    outrasFormas: ["Contar uma situação em que um plano mudou e como você se organizou", "Mostrar uma rotina que você ajusta quando precisa", "Aceitar mudanças avisadas com antecedência e por escrito"],
    perguntar: "Que mudanças acontecem na rotina desta função e com quanta antecedência são avisadas?",
  },
  {
    id: "proatividade",
    termo: "Proatividade",
    variantes: ["proatividade", "proativo", "proativa", "iniciativa"],
    significa: "Ver o que precisa ser feito e começar sem esperar que peçam.",
    necessariaQuando: "A função tem pouca supervisão e a vaga diz o que se espera que a pessoa resolva sozinha.",
    preferenciaQuando: "Vem sem explicar o que a pessoa deve decidir por conta própria. Pergunte quais decisões são suas.",
    outrasFormas: ["Sugerir uma melhoria por escrito", "Manter uma lista própria de tarefas e prazos", "Avisar quando termina e perguntar qual é o próximo passo"],
    perguntar: "Quais tarefas esta função espera que a pessoa comece sozinha e quais precisam de combinação antes?",
  },
  {
    id: "equipe",
    termo: "Trabalho em equipe",
    variantes: ["trabalho em equipe", "trabalhar em equipe", "espírito de equipe", "espirito de equipe", "trabalho em grupo"],
    significa: "Fazer a sua parte combinando com outras pessoas para chegar a um resultado em comum.",
    necessariaQuando: "O resultado só sai com o trabalho de várias pessoas, e a vaga diz de quantas e como elas se combinam.",
    preferenciaQuando: "A função é quase toda individual. Aí pode ser só uma expressão padrão.",
    outrasFormas: ["Dividir tarefas por mensagem ou em um quadro de tarefas", "Entregar a sua parte no prazo combinado", "Pedir e dar ajuda por escrito"],
    perguntar: "Com quantas pessoas eu trabalharia e como a equipe se combina: reuniões, chat, quadro de tarefas?",
  },
  {
    id: "organizacao",
    termo: "Organização",
    variantes: ["organização", "organizacao", "organizado", "organizada", "boa organização"],
    significa: "Manter tarefas, prazos e materiais em ordem para encontrar o que precisa e entregar no tempo.",
    necessariaQuando: "O trabalho envolve muitos prazos, documentos ou etapas, como controle de pedidos ou arquivos.",
    preferenciaQuando: "Não diz o que precisa ficar organizado. Pergunte quais prazos e materiais estão em jogo.",
    outrasFormas: ["Mostrar uma agenda, planilha ou lista que você usa", "Descrever como você guarda e encontra documentos", "Usar lembretes e alarmes"],
    perguntar: "O que esta função precisa manter organizado e que ferramentas a empresa oferece para isso?",
  },
  {
    id: "autonomia",
    termo: "Autonomia",
    variantes: ["autonomia", "autônomo", "autonomo", "autônoma", "trabalhar de forma independente"],
    significa: "Fazer o trabalho sem precisar de acompanhamento o tempo todo, pedindo ajuda quando for preciso.",
    necessariaQuando: "A função é remota ou tem pouca supervisão, e a vaga diz como a pessoa pede ajuda.",
    preferenciaQuando: "Aparece junto de “dinamismo” ou “perfil independente”, sem dizer o que é esperado. Pode significar falta de apoio: pergunte como funciona o acompanhamento.",
    outrasFormas: ["Descrever como você resolve um problema e quando pede ajuda", "Combinar entregas curtas para acompanhar o progresso", "Registrar o passo a passo do que faz"],
    perguntar: "Como é o acompanhamento no começo e a quem peço ajuda quando tenho dúvida?",
  },
  {
    id: "atencao",
    termo: "Atenção aos detalhes",
    variantes: ["atenção aos detalhes", "atencao aos detalhes", "atenção a detalhes", "detalhista", "olhar atento"],
    significa: "Perceber erros pequenos e conferir o trabalho antes de entregar.",
    necessariaQuando: "Um erro pequeno custa caro, como em contas, documentos e conferência de pedidos.",
    preferenciaQuando: "A vaga não diz que tipo de erro importa. Pergunte o que costuma ser conferido.",
    outrasFormas: ["Usar uma lista de conferência", "Pedir uma segunda revisão antes de entregar", "Usar ferramentas que apontam erros, como corretores e planilhas com regras"],
    perguntar: "Que tipo de conferência a função exige e há ferramentas ou revisão de outra pessoa para ajudar?",
  },
  {
    id: "lideranca",
    termo: "Liderança",
    variantes: ["liderança", "lideranca", "perfil de liderança", "capacidade de liderar", "líder"],
    significa: "Orientar outras pessoas para um objetivo, distribuindo tarefas e apoiando a equipe.",
    necessariaQuando: "A função tem gente sob sua responsabilidade e a vaga diz quantas pessoas e que decisões cabem a você.",
    preferenciaQuando: "A vaga não é de gestão. Aí pode ser só um adjetivo de moda.",
    outrasFormas: ["Contar como organizou uma tarefa em grupo, mesmo pequena", "Mostrar um plano de trabalho que você montou", "Orientar outras pessoas por escrito, em reunião ou em tutoriais"],
    perguntar: "Esta função tem pessoas sob sua responsabilidade? Quantas e com que decisões?",
  },
  {
    id: "pressao",
    termo: "Trabalhar sob pressão",
    variantes: ["trabalhar sob pressão", "trabalho sob pressão", "sob pressão", "lidar com pressão", "resiliência", "resiliencia"],
    significa: "Entregar bem quando há prazo curto ou muita demanda.",
    necessariaQuando: "A vaga descreve picos de trabalho reais, como fechamento do mês ou atendimento em horários de pico.",
    preferenciaQuando: "Aparece sem dizer quando a pressão acontece. Pode indicar sobrecarga constante: pergunte sobre prazos, pausas e carga de trabalho.",
    outrasFormas: ["Contar como você se organiza quando o prazo aperta", "Mostrar um calendário com prazos que você cumpriu", "Combinar pausas e prioridades por escrito"],
    perguntar: "Quando acontecem os picos de trabalho, quanto duram e como são distribuídas as pausas e as prioridades?",
  },
];

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** As competências que o texto usa, sem repetir, em palavra inteira e sem diferenciar acento nem maiúsculas. */
export function competenciasNoTexto(texto: string | null | undefined, lista: readonly Competencia[] = COMPETENCIAS): Competencia[] {
  const alvo = semAcento(texto ?? "");
  if (!alvo.trim()) return [];

  return lista.filter((c) =>
    c.variantes.some((v) => new RegExp(`(?<![\\p{L}\\p{N}])${escapar(semAcento(v))}(?![\\p{L}\\p{N}])`, "u").test(alvo)),
  );
}
