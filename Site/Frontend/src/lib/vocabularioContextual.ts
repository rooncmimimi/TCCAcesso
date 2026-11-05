/**
 * Vocabulário contextual do ACESSO para o ditado.
 *
 * A API de reconhecimento de fala dos navegadores NÃO aceita um vocabulário personalizado de forma
 * confiável (não há padrão nem suporte garantido), então o vocabulário não influencia o
 * reconhecimento. Ele entra DEPOIS, como sugestão de correção do texto já reconhecido: o texto nunca
 * é trocado em silêncio; cada sugestão é mostrada e só vale se a pessoa aceitar.
 *
 * Sem IA e sem serviço externo: comparação de palavras (sem acento, sem maiúsculas) e distância de
 * edição pequena.
 */

export type CategoriaDoTermo = "profissao" | "habilidade" | "tecnico" | "modalidade" | "recrutamento" | "glossario" | "empresa";

export type TermoDoVocabulario = { termo: string; categoria: CategoriaDoTermo };

const lista = (categoria: CategoriaDoTermo, termos: string[]): TermoDoVocabulario[] => termos.map((termo) => ({ termo, categoria }));

export const VOCABULARIO: readonly TermoDoVocabulario[] = [
  ...lista("profissao", [
    "assistente administrativo",
    "auxiliar administrativo",
    "analista de sistemas",
    "analista de dados",
    "desenvolvedor",
    "desenvolvedora",
    "programador",
    "designer gráfico",
    "recepcionista",
    "atendente",
    "vendedor",
    "operador de caixa",
    "auxiliar de produção",
    "motorista",
    "técnico de enfermagem",
    "enfermeiro",
    "professor",
    "contador",
    "advogado",
    "coordenador",
    "gerente",
    "estagiário",
    "jovem aprendiz",
    "recursos humanos",
    "telemarketing",
    "almoxarife",
  ]),
  ...lista("habilidade", [
    "comunicação",
    "organização",
    "proatividade",
    "autonomia",
    "trabalho em equipe",
    "atendimento ao cliente",
    "liderança",
    "resolução de problemas",
    "pacote office",
    "planilhas",
    "inglês",
    "espanhol",
    "libras",
    "braille",
  ]),
  ...lista("tecnico", ["Excel", "Word", "PowerPoint", "JavaScript", "TypeScript", "Python", "React", "SQL", "Photoshop", "ERP", "CRM", "SAP", "WhatsApp", "LinkedIn", "GitHub"]),
  ...lista("modalidade", ["home office", "presencial", "híbrido", "remoto", "meio período", "período integral", "turno noturno"]),
  ...lista("recrutamento", [
    "currículo",
    "candidatura",
    "processo seletivo",
    "entrevista",
    "pretensão salarial",
    "período de experiência",
    "banco de horas",
    "vale-transporte",
    "vale-refeição",
    "plano de saúde",
    "carteira assinada",
  ]),
  ...lista("glossario", ["CLT", "PJ", "PCD", "adaptação razoável", "requisitos obrigatórios", "requisitos desejáveis", "cotas", "jornada de trabalho", "benefícios"]),
  ...lista("empresa", ["ACESSO"]),
];

export type Sugestao = {
  /** O trecho como foi reconhecido. */
  trecho: string;
  /** Posição do trecho no texto (índice do primeiro caractere). */
  inicio: number;
  /** Como o vocabulário escreve. */
  sugestao: string;
  categoria: CategoriaDoTermo;
  /** Por que sugerimos, em uma frase simples. */
  motivo: string;
};

/** Sem acento, em minúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Distância de edição (Levenshtein), com corte: devolve `limite + 1` quando passa do limite. */
export function distancia(a: string, b: string, limite: number): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    let minimo = i;

    for (let j = 1; j <= b.length; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
      atual.push(valor);
      if (valor < minimo) minimo = valor;
    }

    if (minimo > limite) return limite + 1;
    anterior = atual;
  }

  return anterior[b.length];
}

type Palavra = { texto: string; inicio: number; fim: number };

function palavrasDe(texto: string): Palavra[] {
  const achadas: Palavra[] = [];
  const padrao = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;
  let m: RegExpExecArray | null;

  while ((m = padrao.exec(texto)) !== null) {
    achadas.push({ texto: m[0], inicio: m.index, fim: m.index + m[0].length });
  }

  return achadas;
}

/** O limite de erros aceito cresce com o tamanho: palavras curtas não ganham sugestão "parecida". */
function limiteDeErros(tamanho: number): number {
  if (tamanho < 5) return 0;
  if (tamanho < 9) return 1;
  return 2;
}

/**
 * Sugere correções para o texto reconhecido. Quatro casos, sempre com o motivo dito à pessoa:
 *  1. o termo está certo mas escrito de outro jeito (`clt` → `CLT`, `ingles` → `inglês`);
 *  2. termo de mais de uma palavra escrito junto ou separado (`homeoffice` → `home office`);
 *  3. termo de uma palavra com um ou dois caracteres trocados (`proatividade` ← `proatividadi`);
 *  4. termo de várias palavras com erro pequeno.
 * Nunca sugere trocar uma palavra que já é, ela mesma, um termo do vocabulário.
 */
export function sugerirCorrecoes(texto: string, vocabulario: readonly TermoDoVocabulario[] = VOCABULARIO): Sugestao[] {
  if (!texto.trim()) return [];

  const palavras = palavrasDe(texto);
  const porNormalizado = new Map(vocabulario.map((t) => [normalizar(t.termo), t]));
  const sugestoes: Sugestao[] = [];
  const usadas = new Set<number>();

  /** Termo escrito em minúsculas no vocabulário: só a caixa diferente (começo de frase, GRITADO) não é erro. */
  const soCaixaDeTermoMinusculo = (trecho: string, termo: TermoDoVocabulario) => termo.termo === termo.termo.toLowerCase() && trecho.toLowerCase() === termo.termo;

  const adicionar = (de: number, ate: number, termo: TermoDoVocabulario, motivo: string) => {
    for (let i = de; i <= ate; i += 1) if (usadas.has(i)) return;
    for (let i = de; i <= ate; i += 1) usadas.add(i);

    const inicio = palavras[de].inicio;
    const trecho = texto.slice(inicio, palavras[ate].fim);
    if (trecho === termo.termo) return;

    sugestoes.push({ trecho, inicio, sugestao: termo.termo, categoria: termo.categoria, motivo });
  };

  // Termos de várias palavras primeiro (janelas de 2 a 4 palavras), para "home office" ganhar de "home".
  const multi = vocabulario.filter((t) => t.termo.includes(" "));
  for (const tamanho of [4, 3, 2]) {
    for (let i = 0; i + tamanho <= palavras.length; i += 1) {
      const janela = texto.slice(palavras[i].inicio, palavras[i + tamanho - 1].fim);
      const alvo = normalizar(janela);

      for (const termo of multi) {
        const n = normalizar(termo.termo);
        if (n.split(" ").length !== tamanho) continue;

        if (alvo === n) {
          if (janela !== termo.termo && !soCaixaDeTermoMinusculo(janela, termo)) adicionar(i, i + tamanho - 1, termo, "Este termo costuma ser escrito assim.");
        } else if (distancia(alvo, n, limiteDeErros(n.length)) <= limiteDeErros(n.length) && limiteDeErros(n.length) > 0) {
          adicionar(i, i + tamanho - 1, termo, "Parece o termo “" + termo.termo + "”.");
        }
      }
    }
  }

  // Termos de uma palavra: forma certa com outra escrita, junto/separado, ou erro pequeno.
  const simples = vocabulario.filter((t) => !t.termo.includes(" "));
  const juntos = new Map(multi.map((t) => [normalizar(t.termo).replace(/ /g, ""), t]));

  palavras.forEach((palavra, indice) => {
    if (usadas.has(indice)) return;
    const n = normalizar(palavra.texto);

    const junto = juntos.get(n);
    if (junto) {
      adicionar(indice, indice, junto, "Este termo costuma ser escrito separado.");
      return;
    }

    const exato = porNormalizado.get(n);
    if (exato) {
      if (palavra.texto !== exato.termo && !soCaixaDeTermoMinusculo(palavra.texto, exato)) adicionar(indice, indice, exato, "Este termo costuma ser escrito assim.");
      return;
    }

    const limite = limiteDeErros(n.length);
    if (limite === 0) return;

    for (const termo of simples) {
      const alvo = normalizar(termo.termo);
      if (alvo === n || distancia(n, alvo, limite) > limite) continue;
      // Diferença só de plural ou gênero não é erro de reconhecimento.
      if (n === `${alvo}s` || alvo === `${n}s`) continue;

      adicionar(indice, indice, termo, "Parece o termo “" + termo.termo + "”.");
      break;
    }
  });

  return sugestoes.sort((a, b) => a.inicio - b.inicio);
}

/** Aplica UMA sugestão que a pessoa aceitou, sem mexer no resto do texto. */
export function aplicarSugestao(texto: string, sugestao: Sugestao): string {
  if (texto.slice(sugestao.inicio, sugestao.inicio + sugestao.trecho.length) !== sugestao.trecho) {
    // O texto mudou depois que a sugestão foi calculada: não arrisca trocar o lugar errado.
    return texto;
  }

  return texto.slice(0, sugestao.inicio) + sugestao.sugestao + texto.slice(sugestao.inicio + sugestao.trecho.length);
}
