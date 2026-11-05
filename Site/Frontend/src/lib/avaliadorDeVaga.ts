/**
 * Avaliador de acessibilidade e clareza de uma vaga, para a empresa rodar ANTES de publicar.
 *
 * Regras fixas e abertas, sem IA e sem serviço externo. É um apoio à escrita: **não é certificação
 * legal**, não garante conformidade com nenhuma lei e **não bloqueia a publicação**. Cada ponto traz
 * uma orientação de melhoria em linguagem simples; quem decide é a empresa.
 *
 * Também aponta expressões que costumam excluir pessoas sem necessidade (a lista é um apoio, e uma
 * expressão pode ser legítima em um caso específico: por isso só explica, nunca proíbe).
 *
 * Funções puras, para testar sem tela.
 */

import type { AcessibilidadeFisica, AmbienteSensorial } from "@/types/ambiente";

export type SituacaoDoPonto = "ok" | "melhorar";

export type PontoDaAvaliacao = {
  id: string;
  area: string;
  situacao: SituacaoDoPonto;
  /** O que foi verificado, em uma frase. */
  titulo: string;
  /** Como melhorar (ou o que está bom). */
  orientacao: string;
};

export type ExpressaoRestritiva = {
  id: string;
  /** O trecho do texto que casou, como a empresa escreveu. */
  trecho: string;
  campo: string;
  explicacao: string;
};

export type DadosParaAvaliar = {
  titulo?: string | null;
  descricao?: string | null;
  requisitos?: string | null;
  requisitosDesejaveis?: string | null;
  atividades?: string | null;
  etapasSelecao?: string | null;
  beneficios?: string | null;
  acessibilidade?: string | null;
  cargaHoraria?: string | null;
  salario?: number | string | null;
  modalidade?: string | null;
  cidade?: string | null;
  estado?: string | null;
  recursosAcessibilidade?: string[] | null;
  entrevistaAdaptacoes?: string[] | null;
  ambienteSensorial?: AmbienteSensorial | null;
  acessibilidadeFisica?: AcessibilidadeFisica | null;
  /** Só existe na edição, depois do envio do vídeo. */
  video?: { legenda: boolean } | null;
};

export type ResultadoDaAvaliacao = {
  pontos: PontoDaAvaliacao[];
  expressoes: ExpressaoRestritiva[];
  aviso: string;
};

export const AVISO_DO_AVALIADOR =
  "Isto é uma orientação para escrever uma vaga mais clara e acessível. Não é certificação nem parecer jurídico, e não impede a publicação.";

const limpar = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

const itens = (texto: string | null | undefined) =>
  (texto ?? "")
    .split(/\n+|;/)
    .map((i) => i.replace(/^\s*(?:[-–—•*·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

const palavras = (texto: string) => (texto ? texto.split(/\s+/).length : 0);

/** Média de palavras por frase. */
export function palavrasPorFrase(texto: string): number {
  const frases = texto.split(/[.!?…]+(?=\s|$)/).map((f) => f.trim()).filter(Boolean);
  if (frases.length === 0) return 0;

  return frases.reduce((soma, f) => soma + palavras(f), 0) / frases.length;
}

type Regra = { id: string; padrao: RegExp; explicacao: string };

/**
 * Expressões que costumam excluir sem necessidade. A explicação diz o que está em jogo e o que dizer
 * no lugar. Pode haver exceção legítima numa função específica: o avaliador não decide.
 */
export const EXPRESSOES_RESTRITIVAS: Regra[] = [
  { id: "aparencia", padrao: /boa\s+apar[eê]ncia|bem\s+apresent[aá]vel|apar[eê]ncia\s+(?:agrad[aá]vel|impec[aá]vel)/i, explicacao: "A aparência não mostra se a pessoa faz bem o trabalho e pode excluir pessoas por traços físicos. Diga o que a função pede, como uniforme ou higiene." },
  { id: "idade-faixa", padrao: /at[eé]\s+\d{2}\s+anos|\d{2}\s+a\s+\d{2}\s+anos|idade\s+(?:m[aá]xima|m[ií]nima|limite)|faixa\s+et[aá]ria/i, explicacao: "Limitar a idade pode ser discriminação. Descreva a experiência ou a habilidade necessária, não a idade." },
  { id: "jovem", padrao: /\bjovens?\b(?!\s+aprendiz)|\bpessoa\s+nova\b|\bperfil\s+jovem\b/i, explicacao: "Pedir uma pessoa “jovem” exclui profissionais mais velhos sem relação com a função. Quando a vaga é de Jovem Aprendiz, diga isso pelo tipo de contrato." },
  { id: "sem-deficiencia", padrao: /sem\s+(?:nenhuma\s+)?defici[eê]ncia|n[aã]o\s+(?:ter|possuir|apresentar)\s+defici[eê]ncia|sa[uú]de\s+perfeita|pessoa\s+saud[aá]vel|plena\s+sa[uú]de|boa\s+sa[uú]de\s+f[ií]sica/i, explicacao: "Exigir ausência de deficiência ou “saúde perfeita” exclui pessoas com deficiência sem necessidade. Descreva a tarefa e deixe aberta a adaptação." },
  { id: "capacidade-fisica", padrao: /(?:necess[aá]rio|essencial|indispens[aá]vel)\s+(?:andar|enxergar|ouvir|falar|ficar\s+em\s+p[eé])|ficar\s+em\s+p[eé]\s+por\s+(?:longos|muitas)|(?:ouvir|enxergar|andar)\s+perfeitamente|acuidade\s+(?:visual|auditiva)\s+perfeita/i, explicacao: "Se a função exige uma capacidade física, diga qual tarefa precisa dela e se há outra forma de fazê-la. Assim a pessoa decide e a empresa avalia adaptações." },
  { id: "comunicacao-oral", padrao: /excelente\s+comunica[cç][aã]o\s+(?:oral|verbal)|boa\s+(?:dic[cç][aã]o|oratória)|facilidade\s+(?:para|de)\s+falar\s+em\s+p[uú]blico|comunica[cç][aã]o\s+verbal\s+(?:excelente|impec[aá]vel)/i, explicacao: "Pedir comunicação oral pode excluir pessoas surdas ou com dificuldade de fala. Diga se a função precisa mesmo de fala e aceite outras formas de comunicação, como escrita ou Libras." },
  { id: "genero", padrao: /\bsexo\s+(?:masculino|feminino)\b|\bapenas\s+(?:homens|mulheres)\b|\bsomente\s+(?:homens|mulheres)\b|\bpreferência\s+por\s+(?:homens|mulheres)\b/i, explicacao: "Escolher por gênero é discriminação, salvo exceções previstas em lei. Descreva a função, não o gênero." },
  { id: "estado-civil", padrao: /\b(?:solteir[oa]s?|sem\s+filhos|n[aã]o\s+ter\s+filhos|casad[oa]s?\s+(?:preferencialmente|apenas))\b/i, explicacao: "Estado civil e filhos não dizem nada sobre o trabalho. Fale de disponibilidade de horário, que é o que importa." },
  { id: "disponibilidade-total", padrao: /disponibilidade\s+(?:total|integral\s+e\s+imediata)|dedica[cç][aã]o\s+exclusiva\s+e\s+irrestrita|sem\s+hor[aá]rio\s+para\s+sair/i, explicacao: "Disponibilidade irrestrita exclui quem cuida de outras pessoas ou precisa de rotina para o tratamento. Informe a jornada real e deixe claro o que é flexível." },
  { id: "dinamico", padrao: /perfil\s+(?:din[aâ]mico|[aá]gil|proativo\s+e\s+din[aâ]mico)|pessoa\s+(?:din[aâ]mica|[aá]gil\s+e\s+din[aâ]mica)/i, explicacao: "“Dinâmico” e “ágil” são vagos e podem ser lidos como exigência física. Diga o que a função faz no dia a dia." },
  { id: "carteira", padrao: /(?:cnh|carteira\s+de\s+habilita[cç][aã]o)\s+(?:obrigat[oó]ria|categoria\s+[a-e])|ter\s+(?:carro|ve[ií]culo)\s+pr[oó]prio/i, explicacao: "Se a função não é de dirigir, exigir carteira de habilitação ou veículo próprio exclui pessoas que usam outro transporte. Peça só quando o trabalho exigir." },
  { id: "experiencia-excessiva", padrao: /(?:m[ií]nimo\s+de\s+)?(?:[5-9]|\d{2})\s+anos\s+de\s+experi[eê]ncia(?:\s+comprovada)?/i, explicacao: "Muitos anos de experiência obrigatória afastam pessoas capazes. Se for um diferencial, coloque em “desejáveis”." },
];

/** Procura as expressões em cada campo de texto da vaga. */
export function encontrarExpressoesRestritivas(dados: DadosParaAvaliar): ExpressaoRestritiva[] {
  const campos: [string, string | null | undefined][] = [
    ["Título", dados.titulo],
    ["Descrição", dados.descricao],
    ["Requisitos", dados.requisitos],
    ["Requisitos desejáveis", dados.requisitosDesejaveis],
    ["Atividades", dados.atividades],
  ];

  const achadas: ExpressaoRestritiva[] = [];

  for (const [campo, texto] of campos) {
    const limpo = limpar(texto);
    if (!limpo) continue;

    for (const regra of EXPRESSOES_RESTRITIVAS) {
      const m = limpo.match(regra.padrao);
      if (m) achadas.push({ id: `${regra.id}:${campo}`, trecho: m[0], campo, explicacao: regra.explicacao });
    }
  }

  return achadas;
}

const ok = (id: string, area: string, titulo: string, orientacao: string): PontoDaAvaliacao => ({ id, area, situacao: "ok", titulo, orientacao });
const melhorar = (id: string, area: string, titulo: string, orientacao: string): PontoDaAvaliacao => ({ id, area, situacao: "melhorar", titulo, orientacao });

/** Roda todas as verificações. Nada aqui bloqueia a publicação. */
export function avaliarVaga(dados: DadosParaAvaliar): ResultadoDaAvaliacao {
  const pontos: PontoDaAvaliacao[] = [];

  const descricao = limpar(dados.descricao);
  const media = palavrasPorFrase(descricao);
  if (descricao.length < 80) {
    pontos.push(melhorar("clareza", "Clareza da descrição", "A descrição é curta", "Conte em poucas frases o que a pessoa vai fazer, com quem trabalha e como é o dia a dia."));
  } else if (media > 28) {
    pontos.push(melhorar("clareza", "Clareza da descrição", "As frases são longas", `Em média, cada frase tem ${Math.round(media)} palavras. Frases de até 20 palavras são mais fáceis de ler, e de ouvir por leitor de tela.`));
  } else {
    pontos.push(ok("clareza", "Clareza da descrição", "A descrição está clara", "As frases têm um tamanho confortável para ler e ouvir."));
  }

  const atividades = itens(dados.atividades);
  pontos.push(
    atividades.length > 0
      ? ok("atividades", "Atividades", "As atividades estão separadas", "A pessoa vê o que vai fazer sem precisar procurar no texto.")
      : melhorar("atividades", "Atividades", "As atividades não estão listadas à parte", "Liste, uma por linha, o que a pessoa vai fazer. Fica mais fácil de entender e de comparar com outras vagas."),
  );

  const obrigatorios = itens(dados.requisitos);
  const desejaveis = itens(dados.requisitosDesejaveis);
  if (obrigatorios.length === 0 && desejaveis.length === 0) {
    pontos.push(melhorar("requisitos", "Requisitos obrigatórios e desejáveis", "Nenhum requisito informado", "Diga o que é indispensável e o que seria um diferencial. Quem lê saberá se pode se candidatar."));
  } else if (desejaveis.length === 0) {
    pontos.push(melhorar("requisitos", "Requisitos obrigatórios e desejáveis", "Obrigatórios e desejáveis não estão separados", "Mova para “desejáveis” o que a pessoa pode aprender no trabalho. Isso evita que alguém capaz desista."));
  } else if (obrigatorios.length > 8) {
    pontos.push(melhorar("requisitos", "Requisitos obrigatórios e desejáveis", `São ${obrigatorios.length} requisitos obrigatórios`, "Uma lista longa de obrigatórios afasta candidaturas. Confira se todos são mesmo indispensáveis."));
  } else {
    pontos.push(ok("requisitos", "Requisitos obrigatórios e desejáveis", "Obrigatórios e desejáveis estão separados", "A pessoa sabe o que é indispensável e o que é diferencial."));
  }

  pontos.push(
    limpar(dados.cargaHoraria)
      ? ok("jornada", "Jornada", "A jornada foi informada", "Quem precisa organizar a rotina consegue decidir.")
      : melhorar("jornada", "Jornada", "A jornada não foi informada", "Diga os dias e horários, e o que é flexível."),
  );

  const salario = typeof dados.salario === "number" ? dados.salario : Number(String(dados.salario ?? "").replace(",", "."));
  pontos.push(
    Number.isFinite(salario) && salario > 0
      ? ok("salario", "Salário", "O salário foi informado", "Informar o valor poupa tempo de quem se candidata.")
      : melhorar("salario", "Salário", "O salário não foi informado", "Se puder, informe o valor ou a faixa. Se não puder, escreva “a combinar” com as regras."),
  );

  const presencialOuHibrido = dados.modalidade === "presencial" || dados.modalidade === "hibrido";
  pontos.push(
    !dados.modalidade
      ? melhorar("modalidade", "Modalidade e local", "A modalidade não foi informada", "Diga se é presencial, híbrida ou remota.")
      : presencialOuHibrido && !limpar(dados.cidade)
        ? melhorar("modalidade", "Modalidade e local", "Falta a cidade", "Em vaga presencial ou híbrida, informe a cidade para a pessoa saber se consegue chegar.")
        : ok("modalidade", "Modalidade e local", "Modalidade e local informados", "A pessoa sabe onde e como vai trabalhar."),
  );

  const mapa = dados.acessibilidadeFisica ?? {};
  const itensInformados = Object.keys(mapa).length;
  const recursos = dados.recursosAcessibilidade ?? [];
  if (presencialOuHibrido) {
    pontos.push(
      itensInformados > 0 || recursos.length > 0
        ? ok("fisica", "Acessibilidade física", "A acessibilidade do local foi informada", itensInformados > 0 ? `${itensInformados} item(ns) do mapa preenchido(s). O que não for preenchido aparece como “não informado”.` : "Há recursos de acessibilidade marcados. O mapa de acessibilidade física daria ainda mais detalhe.")
        : melhorar("fisica", "Acessibilidade física", "Nada sobre a acessibilidade do local", "Preencha o mapa de acessibilidade física (rampas, elevador, banheiro, entrada). Se não souber algum item, deixe sem preencher: ele aparece como “não informado”."),
    );
  }

  const sensorial = dados.ambienteSensorial ?? {};
  pontos.push(
    Object.keys(sensorial).some((k) => k !== "rotina")
      ? ok("sensorial", "Ambiente de trabalho", "A prévia sensorial foi preenchida", "Ruído, iluminação e rotina ajudam quem é sensível a esses fatores a decidir.")
      : melhorar("sensorial", "Ambiente de trabalho", "Não há prévia do ambiente", "Descreva ruído, iluminação, espaço, interrupções e pausas. Preencha só o que você sabe; o resto aparece como “não informado”."),
  );

  const formasDeComunicar = (dados.entrevistaAdaptacoes ?? []).length > 0 || Boolean(sensorial.comunicacao);
  pontos.push(
    formasDeComunicar
      ? ok("comunicacao", "Formas de comunicação", "As formas de comunicação foram informadas", "A pessoa sabe como a entrevista e o trabalho acontecem.")
      : melhorar("comunicacao", "Formas de comunicação", "Não há informação sobre comunicação", "Diga se a entrevista pode ser por texto, vídeo ou com intérprete de Libras, e se a comunicação do dia a dia é escrita ou oral."),
  );

  if (dados.video) {
    pontos.push(
      dados.video.legenda
        ? ok("legendas", "Legendas", "O vídeo tem legenda", "Quem não ouve consegue acompanhar o vídeo.")
        : melhorar("legendas", "Legendas", "O vídeo está sem legenda", "A transcrição já ajuda, mas uma legenda WebVTT deixa o vídeo acompanhável por quem não ouve."),
    );
  }

  if (!limpar(dados.etapasSelecao)) {
    pontos.push(melhorar("etapas", "Etapas da seleção", "As etapas não foram informadas", "Conte quantas etapas há e o que acontece em cada uma. Reduz a ansiedade de quem se candidata."));
  } else {
    pontos.push(ok("etapas", "Etapas da seleção", "As etapas foram informadas", "A pessoa sabe o caminho do processo."));
  }

  const expressoes = encontrarExpressoesRestritivas(dados);
  pontos.push(
    expressoes.length > 0
      ? melhorar("linguagem", "Linguagem", `${expressoes.length} expressão(ões) que costuma(m) excluir`, "Veja a lista abaixo. Se houver uma exigência real da função, explique o motivo no texto.")
      : ok("linguagem", "Linguagem", "Nenhuma expressão restritiva da nossa lista", "A lista é um apoio e não cobre tudo: releia o texto pensando em quem poderia se sentir de fora."),
  );

  return { pontos, expressoes, aviso: AVISO_DO_AVALIADOR };
}

/** Quantos pontos ainda podem melhorar. */
export const contarMelhorias = (r: ResultadoDaAvaliacao) => r.pontos.filter((p) => p.situacao === "melhorar").length;
