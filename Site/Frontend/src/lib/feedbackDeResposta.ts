/**
 * Retorno do simulador sobre uma resposta de treino: sugestões de melhoria, em linguagem simples.
 *
 * Regras determinísticas e abertas, sem IA. É treino, não avaliação: NÃO há nota, NÃO há "aprovado" ou
 * "reprovado", e nada aqui avalia a pessoa, a deficiência ou a capacidade profissional. Só aponta o
 * que a resposta já tem de bom e o que pode ajudar a deixá-la mais clara. Cada pessoa tem o seu jeito
 * de se comunicar: respostas curtas e diretas são válidas.
 */

export type RetornoDeResposta = {
  /** O que a resposta já tem de bom. */
  pontosFortes: string[];
  /** Ideias para melhorar, nunca como falha. */
  sugestoes: string[];
};

const contarPalavras = (texto: string) => (texto.trim() ? texto.trim().split(/\s+/).length : 0);

const TEM_EXEMPLO = /\b(por exemplo|quando|uma vez|na minha|no meu|fui|trabalhei|aprendi|fiz|organizei|atendi|cadastrei|ajudei|combinei)\b/i;
const TEM_MOTIVO = /\b(porque|pois|por isso|já que|assim|para que)\b/i;
const TEM_NUMERO = /\d/;
const FALA_DE_SI = /\b(eu|sou|fui|tenho|gosto|sei|prefiro|busco|minha|meu|minhas|meus)\b/i;

export function retornoDaResposta(resposta: string): RetornoDeResposta {
  const palavras = contarPalavras(resposta);

  if (palavras === 0) {
    return { pontosFortes: [], sugestoes: ["Escreva (ou dite) uma resposta, mesmo curta. Você pode ler a orientação e o exemplo antes."] };
  }

  const pontosFortes: string[] = [];
  const sugestoes: string[] = [];

  if (palavras >= 15 && palavras <= 120) {
    pontosFortes.push("O tamanho está bom: dá para entender a ideia sem se alongar.");
  } else if (palavras < 15) {
    sugestoes.push("Se quiser, acrescente uma frase com mais detalhe. Uma resposta curta também vale, mas um exemplo ajuda quem ouve.");
  } else {
    sugestoes.push("A resposta ficou longa. Você pode separar em duas ou três ideias e começar pela mais importante.");
  }

  if (TEM_EXEMPLO.test(resposta) || TEM_NUMERO.test(resposta)) {
    pontosFortes.push("Você falou de algo que viveu ou fez, e isso deixa a resposta concreta.");
  } else {
    sugestoes.push("Tente contar uma situação real, mesmo pequena. Por exemplo: “quando trabalhei em…, eu…”.");
  }

  if (TEM_MOTIVO.test(resposta)) {
    pontosFortes.push("Você explicou o porquê, o que ajuda a entender o seu ponto de vista.");
  } else {
    sugestoes.push("Se couber, diga o porquê. Uma frase com “porque…” deixa a resposta mais clara.");
  }

  if (!FALA_DE_SI.test(resposta)) {
    sugestoes.push("Conte em primeira pessoa (“eu faço”, “eu gosto”). Assim a resposta fala de você.");
  }

  return { pontosFortes, sugestoes };
}

/** O retorno do exercício de classificar requisitos: explica, não pontua. */
export function explicarClassificacao(esperada: string, escolhida: string | undefined): string {
  if (!escolhida) return "Você ainda não classificou este requisito.";
  if (esperada === escolhida) return "Isso mesmo: o texto da vaga sustenta essa escolha.";

  return "O texto da vaga aponta para o outro lado. Reveja a dica: ler como a vaga escreve (“é necessário”, “diferencial”) ajuda a decidir.";
}
