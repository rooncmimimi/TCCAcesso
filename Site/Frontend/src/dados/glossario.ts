import { tx } from "@/i18n/frases";

/**
 * Glossário profissional do ACESSO: termos que aparecem em vagas, candidaturas e cadastro, com uma
 * explicação curta em linguagem simples. Escrito à mão, sem IA, e com o cuidado de não prometer o
 * que a lei ou a empresa não prometem: onde a regra varia por empresa ou contrato, o texto diz que
 * varia.
 *
 * `variantes` são as formas como o termo costuma aparecer escrito (com e sem acento, plural, sigla),
 * usadas para achar o termo dentro do texto de uma vaga.
 */

export type TermoDoGlossario = {
  id: string;
  termo: string;
  variantes: string[];
  explicacao: string;
  exemplo?: string;
};

export const GLOSSARIO: readonly TermoDoGlossario[] = [
  {
    id: "clt",
    termo: "CLT",
    variantes: ["CLT", "carteira assinada"],
    get explicacao() { return tx("É o contrato de trabalho com carteira assinada. Dá direitos como férias, 13º salário, FGTS e descanso semanal remunerado."); },
    get exemplo() { return tx("Vaga CLT: a empresa assina sua carteira de trabalho e você tem esses direitos."); },
  },
  {
    id: "pj",
    termo: "PJ",
    variantes: ["PJ", "pessoa jurídica"],
    get explicacao() { return tx("Você presta o serviço como empresa, com CNPJ, e emite nota fiscal. Os direitos da CLT, como férias e 13º, não vêm automaticamente: o que vale é o combinado no contrato. Você paga os próprios impostos."); },
  },
  {
    id: "presencial",
    get termo() { return tx("Presencial"); },
    variantes: ["presencial", "presenciais"],
    get explicacao() { return tx("Você trabalha no local da empresa, nos dias e horários combinados."); },
  },
  {
    id: "remoto",
    get termo() { return tx("Remoto"); },
    variantes: ["remoto", "remota", "home office", "trabalho remoto"],
    get explicacao() { return tx("Você trabalha de casa ou de outro lugar, sem precisar ir à empresa. A empresa diz se pede algum encontro presencial."); },
  },
  {
    id: "hibrido",
    get termo() { return tx("Híbrido"); },
    variantes: ["híbrido", "hibrido", "híbrida", "hibrida"],
    get explicacao() { return tx("Uma parte dos dias é na empresa e a outra é em casa. A empresa informa quantos dias são de cada tipo."); },
    get exemplo() { return tx("Três dias na empresa e dois dias em casa."); },
  },
  {
    id: "pcd",
    termo: "PCD",
    variantes: ["PCD", "PcD", "pessoa com deficiência", "pessoas com deficiência"],
    get explicacao() { return tx("Pessoa com deficiência. É quem tem uma limitação física, sensorial, intelectual ou mental que, junto com barreiras do ambiente, pode dificultar a participação plena no trabalho."); },
  },
  {
    id: "cotas",
    get termo() { return tx("Cotas"); },
    variantes: ["cotas", "cota", "lei de cotas"],
    get explicacao() { return tx("A Lei de Cotas (Lei 8.213/1991) manda empresas com 100 ou mais empregados reservar de 2% a 5% das vagas para pessoas com deficiência e reabilitadas do INSS. A porcentagem depende do tamanho da empresa."); },
  },
  {
    id: "adaptacao-razoavel",
    get termo() { return tx("Adaptação razoável"); },
    variantes: ["adaptação razoável", "adaptacao razoavel", "adaptações razoáveis", "adaptacoes razoaveis"],
    get explicacao() { return tx("É um ajuste que a empresa faz para você poder trabalhar em igualdade com os outros, como um intérprete de Libras, um software leitor de tela ou um horário diferente. A Lei Brasileira de Inclusão diz que negar uma adaptação razoável é discriminação, quando ela não gera custo desproporcional."); },
    get exemplo() { return tx("Pedir legendas nas reuniões ou mais tempo para uma prova."); },
  },
  {
    id: "beneficios",
    get termo() { return tx("Benefícios"); },
    variantes: ["benefícios", "beneficios", "benefício", "beneficio"],
    get explicacao() { return tx("Vantagens que a empresa oferece além do salário, como vale-refeição, vale-transporte, plano de saúde e auxílio-creche. Cada empresa informa os seus."); },
  },
  {
    id: "jornada",
    get termo() { return tx("Jornada"); },
    variantes: ["jornada", "jornada de trabalho", "carga horária"],
    get explicacao() { return tx("É o tempo que você trabalha por dia ou por semana, com os horários de entrada e saída."); },
    get exemplo() { return tx("Jornada de 6 horas por dia, de segunda a sexta."); },
  },
  {
    id: "banco-de-horas",
    get termo() { return tx("Banco de horas"); },
    variantes: ["banco de horas"],
    get explicacao() { return tx("As horas extras que você trabalha ficam guardadas e viram folga depois, em vez de serem pagas na hora. As regras são combinadas em acordo ou na convenção da categoria."); },
  },
  {
    id: "periodo-de-experiencia",
    get termo() { return tx("Período de experiência"); },
    variantes: ["período de experiência", "periodo de experiencia", "contrato de experiência", "contrato de experiencia"],
    get explicacao() { return tx("Os primeiros dias do contrato, em que a empresa e você veem se o trabalho serve para os dois. Na CLT, o contrato de experiência dura no máximo 90 dias. Se continuar, vira contrato normal."); },
  },
  {
    id: "requisitos-obrigatorios",
    get termo() { return tx("Requisitos obrigatórios"); },
    variantes: ["requisitos obrigatórios", "requisitos obrigatorios", "obrigatório", "obrigatorio", "obrigatórios"],
    get explicacao() { return tx("O que a empresa diz ser indispensável para a vaga. Quem não tem tudo isso tem menos chance de seguir no processo."); },
  },
  {
    id: "requisitos-desejaveis",
    get termo() { return tx("Requisitos desejáveis"); },
    variantes: ["requisitos desejáveis", "requisitos desejaveis", "desejável", "desejavel", "diferencial", "diferenciais"],
    get explicacao() { return tx("O que a empresa gostaria que você tivesse, mas não é obrigatório. Você pode se candidatar mesmo sem ter."); },
  },
  {
    id: "proatividade",
    get termo() { return tx("Proatividade"); },
    variantes: ["proatividade", "proativo", "proativa"],
    get explicacao() { return tx("É agir sem esperar que mandem: ver o que precisa ser feito, sugerir melhorias e resolver pequenos problemas por conta própria."); },
    get exemplo() { return tx("Perceber que falta um material e avisar antes de acabar."); },
  },
  {
    id: "autonomia",
    get termo() { return tx("Autonomia"); },
    variantes: ["autonomia", "autônomo", "autonomo", "autônoma"],
    get explicacao() { return tx("É conseguir fazer suas tarefas sem precisar de ajuda o tempo todo, decidindo como organizar o seu trabalho dentro do que a empresa combinou."); },
  },
  {
    id: "estagio",
    get termo() { return tx("Estágio"); },
    variantes: ["estágio", "estagio", "estagiário", "estagiaria", "estagiária"],
    get explicacao() { return tx("Experiência de trabalho para quem está estudando. Tem prazo definido e não é um emprego com carteira assinada."); },
  },
  {
    id: "jovem-aprendiz",
    get termo() { return tx("Jovem aprendiz"); },
    variantes: ["jovem aprendiz", "aprendiz"],
    get explicacao() { return tx("Programa que une estudo e trabalho para jovens. Tem carteira assinada e prazo determinado, e a pessoa aprende a profissão na prática."); },
  },
];

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Os termos do glossário que aparecem em `texto`, sem repetir e na ordem do glossário. Compara sem
 * acento e sem diferenciar maiúsculas, e só em palavra inteira (a sigla "PJ" não aparece dentro de
 * "objeto", nem "cota" dentro de "escotilha").
 */
export function termosNoTexto(texto: string, glossario: readonly TermoDoGlossario[] = GLOSSARIO): TermoDoGlossario[] {
  const alvo = semAcento(texto).toLowerCase();
  if (!alvo.trim()) return [];

  return glossario.filter((termo) =>
    termo.variantes.some((variante) => {
      const padrao = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(semAcento(variante).toLowerCase())}(?![\\p{L}\\p{N}])`, "u");
      return padrao.test(alvo);
    }),
  );
}
