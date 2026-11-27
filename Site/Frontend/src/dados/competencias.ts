import { tx } from "@/i18n/frases";

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
    get termo() { return tx("Boa comunicação"); },
    variantes: ["boa comunicação", "comunicação eficaz", "comunicação clara", "boa comunicacao", "comunicativo", "comunicativa"],
    get significa() { return tx("Conseguir passar e receber informações de forma que os outros entendam. Pode ser por escrito, em Libras, por fala, por imagens ou por outros recursos."); },
    get necessariaQuando() { return tx("O trabalho depende de trocar informações o tempo todo, como atendimento ao cliente ou coordenação de equipe."); },
    get preferenciaQuando() { return tx("A vaga não diz com quem nem como a pessoa vai se comunicar. Aí pode ser uma frase pronta, e vale perguntar."); },
    get outrasFormas() { return [tx("Mensagens e e-mails claros"), tx("Comunicação em Libras, com ou sem intérprete"), tx("Apresentações por escrito ou com imagens"), tx("Comunicação alternativa, como cartões e aplicativos")]; },
    get perguntar() { return tx("Como a comunicação acontece no dia a dia desta função: por escrito, por voz, por chat? Posso me comunicar do jeito que funciona melhor para mim?"); },
  },
  {
    id: "flexibilidade",
    get termo() { return tx("Flexibilidade"); },
    variantes: ["flexibilidade", "flexível", "jogo de cintura", "adaptabilidade"],
    get significa() { return tx("Ajustar-se quando o plano muda, por exemplo uma tarefa nova ou um horário diferente."); },
    get necessariaQuando() { return tx("O trabalho muda de prioridade com frequência e a vaga diz que mudanças de horário ou de tarefa são comuns."); },
    get preferenciaQuando() { return tx("Aparece sem exemplo. Pode esconder a expectativa de trabalhar além do combinado: vale perguntar o que muda e com que aviso."); },
    get outrasFormas() { return [tx("Contar uma situação em que um plano mudou e como você se organizou"), tx("Mostrar uma rotina que você ajusta quando precisa"), tx("Aceitar mudanças avisadas com antecedência e por escrito")]; },
    get perguntar() { return tx("Que mudanças acontecem na rotina desta função e com quanta antecedência são avisadas?"); },
  },
  {
    id: "proatividade",
    get termo() { return tx("Proatividade"); },
    variantes: ["proatividade", "proativo", "proativa", "iniciativa"],
    get significa() { return tx("Ver o que precisa ser feito e começar sem esperar que peçam."); },
    get necessariaQuando() { return tx("A função tem pouca supervisão e a vaga diz o que se espera que a pessoa resolva sozinha."); },
    get preferenciaQuando() { return tx("Vem sem explicar o que a pessoa deve decidir por conta própria. Pergunte quais decisões são suas."); },
    get outrasFormas() { return [tx("Sugerir uma melhoria por escrito"), tx("Manter uma lista própria de tarefas e prazos"), tx("Avisar quando termina e perguntar qual é o próximo passo")]; },
    get perguntar() { return tx("Quais tarefas esta função espera que a pessoa comece sozinha e quais precisam de combinação antes?"); },
  },
  {
    id: "equipe",
    get termo() { return tx("Trabalho em equipe"); },
    variantes: ["trabalho em equipe", "trabalhar em equipe", "espírito de equipe", "espirito de equipe", "trabalho em grupo"],
    get significa() { return tx("Fazer a sua parte combinando com outras pessoas para chegar a um resultado em comum."); },
    get necessariaQuando() { return tx("O resultado só sai com o trabalho de várias pessoas, e a vaga diz de quantas e como elas se combinam."); },
    get preferenciaQuando() { return tx("A função é quase toda individual. Aí pode ser só uma expressão padrão."); },
    get outrasFormas() { return [tx("Dividir tarefas por mensagem ou em um quadro de tarefas"), tx("Entregar a sua parte no prazo combinado"), tx("Pedir e dar ajuda por escrito")]; },
    get perguntar() { return tx("Com quantas pessoas eu trabalharia e como a equipe se combina: reuniões, chat, quadro de tarefas?"); },
  },
  {
    id: "organizacao",
    get termo() { return tx("Organização"); },
    variantes: ["organização", "organizacao", "organizado", "organizada", "boa organização"],
    get significa() { return tx("Manter tarefas, prazos e materiais em ordem para encontrar o que precisa e entregar no tempo."); },
    get necessariaQuando() { return tx("O trabalho envolve muitos prazos, documentos ou etapas, como controle de pedidos ou arquivos."); },
    get preferenciaQuando() { return tx("Não diz o que precisa ficar organizado. Pergunte quais prazos e materiais estão em jogo."); },
    get outrasFormas() { return [tx("Mostrar uma agenda, planilha ou lista que você usa"), tx("Descrever como você guarda e encontra documentos"), tx("Usar lembretes e alarmes")]; },
    get perguntar() { return tx("O que esta função precisa manter organizado e que ferramentas a empresa oferece para isso?"); },
  },
  {
    id: "autonomia",
    get termo() { return tx("Autonomia"); },
    variantes: ["autonomia", "autônomo", "autonomo", "autônoma", "trabalhar de forma independente"],
    get significa() { return tx("Fazer o trabalho sem precisar de acompanhamento o tempo todo, pedindo ajuda quando for preciso."); },
    get necessariaQuando() { return tx("A função é remota ou tem pouca supervisão, e a vaga diz como a pessoa pede ajuda."); },
    get preferenciaQuando() { return tx("Aparece junto de “dinamismo” ou “perfil independente”, sem dizer o que é esperado. Pode significar falta de apoio: pergunte como funciona o acompanhamento."); },
    get outrasFormas() { return [tx("Descrever como você resolve um problema e quando pede ajuda"), tx("Combinar entregas curtas para acompanhar o progresso"), tx("Registrar o passo a passo do que faz")]; },
    get perguntar() { return tx("Como é o acompanhamento no começo e a quem peço ajuda quando tenho dúvida?"); },
  },
  {
    id: "atencao",
    get termo() { return tx("Atenção aos detalhes"); },
    variantes: ["atenção aos detalhes", "atencao aos detalhes", "atenção a detalhes", "detalhista", "olhar atento"],
    get significa() { return tx("Perceber erros pequenos e conferir o trabalho antes de entregar."); },
    get necessariaQuando() { return tx("Um erro pequeno custa caro, como em contas, documentos e conferência de pedidos."); },
    get preferenciaQuando() { return tx("A vaga não diz que tipo de erro importa. Pergunte o que costuma ser conferido."); },
    get outrasFormas() { return [tx("Usar uma lista de conferência"), tx("Pedir uma segunda revisão antes de entregar"), tx("Usar ferramentas que apontam erros, como corretores e planilhas com regras")]; },
    get perguntar() { return tx("Que tipo de conferência a função exige e há ferramentas ou revisão de outra pessoa para ajudar?"); },
  },
  {
    id: "lideranca",
    get termo() { return tx("Liderança"); },
    variantes: ["liderança", "lideranca", "perfil de liderança", "capacidade de liderar", "líder"],
    get significa() { return tx("Orientar outras pessoas para um objetivo, distribuindo tarefas e apoiando a equipe."); },
    get necessariaQuando() { return tx("A função tem gente sob sua responsabilidade e a vaga diz quantas pessoas e que decisões cabem a você."); },
    get preferenciaQuando() { return tx("A vaga não é de gestão. Aí pode ser só um adjetivo de moda."); },
    get outrasFormas() { return [tx("Contar como organizou uma tarefa em grupo, mesmo pequena"), tx("Mostrar um plano de trabalho que você montou"), tx("Orientar outras pessoas por escrito, em reunião ou em tutoriais")]; },
    get perguntar() { return tx("Esta função tem pessoas sob sua responsabilidade? Quantas e com que decisões?"); },
  },
  {
    id: "pressao",
    get termo() { return tx("Trabalhar sob pressão"); },
    variantes: ["trabalhar sob pressão", "trabalho sob pressão", "sob pressão", "lidar com pressão", "resiliência", "resiliencia"],
    get significa() { return tx("Entregar bem quando há prazo curto ou muita demanda."); },
    get necessariaQuando() { return tx("A vaga descreve picos de trabalho reais, como fechamento do mês ou atendimento em horários de pico."); },
    get preferenciaQuando() { return tx("Aparece sem dizer quando a pressão acontece. Pode indicar sobrecarga constante: pergunte sobre prazos, pausas e carga de trabalho."); },
    get outrasFormas() { return [tx("Contar como você se organiza quando o prazo aperta"), tx("Mostrar um calendário com prazos que você cumpriu"), tx("Combinar pausas e prioridades por escrito")]; },
    get perguntar() { return tx("Quando acontecem os picos de trabalho, quanto duram e como são distribuídas as pausas e as prioridades?"); },
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
