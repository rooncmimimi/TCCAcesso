/**
 * Resumo da vaga em linguagem simples, montado só com regras fixas e modelos de frase sobre os
 * campos que a empresa preencheu. Nada de IA, nada de serviço externo, e **nada inventado**: o que a
 * empresa não informou aparece como "não informado", nunca como suposição.
 *
 * O que o texto livre da vaga permite (e o que não):
 * - "O que você vai fazer" é o início da descrição que a empresa escreveu, em até duas frases, com
 *   poucas trocas seguras de abertura ("Profissional responsável por…" vira "Você vai ser
 *   responsável por…"). Não reescreve o sentido, não resume com palavras nossas.
 * - Requisitos e benefícios viram listas, quebradas nas linhas, `;` ou marcadores que a empresa
 *   usou. O cadastro de vagas tem **um** campo de requisitos: o resumo diz que a empresa não
 *   separou obrigatórios de desejáveis, em vez de adivinhar.
 * - Etapas da seleção: a vaga não tem esse campo hoje, e o resumo diz que não foram informadas.
 *
 * Funções puras, para testar sem tela.
 */

import type { ContratoVaga, ModalidadeVaga, PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga } from "@/types";

export const NAO_INFORMADO = "A empresa não informou.";

const MODALIDADE: Record<ModalidadeVaga, string> = {
  presencial: "Presencial: você trabalha no local da empresa.",
  hibrido: "Híbrido: parte dos dias no local da empresa e parte em casa.",
  remoto: "Remoto: você trabalha de casa ou de outro lugar, sem ir à empresa.",
};

const CONTRATO: Record<ContratoVaga, string> = {
  clt: "CLT (carteira assinada, com direitos como férias, 13º salário e FGTS).",
  pj: "PJ (você presta o serviço como empresa, com CNPJ, e cuida dos próprios impostos).",
  estagio: "Estágio (para quem está estudando, com período definido).",
  jovem_aprendiz: "Jovem aprendiz (programa de aprendizagem para jovens, com estudo e trabalho).",
  temporario: "Temporário (por um período determinado).",
};

const PUBLICO: Record<PublicoAlvoVaga, string | null> = {
  geral: null,
  pcd: "Esta vaga é para pessoas com deficiência (PCD).",
  cinquenta_mais: "Esta vaga é para profissionais com 50 anos ou mais.",
  pcd_cinquenta_mais: "Esta vaga é para pessoas com deficiência (PCD) e para profissionais com 50 anos ou mais.",
};

const RECURSO: Record<RecursoAcessibilidadeVaga, string> = {
  interprete_libras: "Intérprete de Libras",
  tecnologia_assistiva: "Tecnologia assistiva",
  ambiente_fisico_acessivel: "Ambiente físico acessível",
  banheiro_adaptado: "Banheiro adaptado",
  elevador_rampa: "Elevador ou rampa",
  jornada_adaptavel: "Jornada adaptável",
  ferramentas_digitais_acessiveis: "Ferramentas digitais acessíveis",
  outro: "Outro recurso (veja os detalhes da vaga)",
};

/** Uma parte do resumo: um título e um texto, ou uma lista. `informado` é falso quando a empresa não disse. */
export type SecaoDoResumo = {
  id: string;
  titulo: string;
  informado: boolean;
} & ({ tipo: "texto"; texto: string } | { tipo: "lista"; itens: string[]; observacao?: string });

export type ResumoDaVaga = {
  secoes: SecaoDoResumo[];
  /** O resumo todo em frases corridas, para a voz ler e para guardar no histórico. */
  textoFalado: string;
};

function limpar(texto: string | null | undefined): string {
  return (texto ?? "").replace(/\s+/g, " ").trim();
}

/** Garante um ponto final sem duplicar pontuação. */
function comPontoFinal(frase: string): string {
  return /[.!?…:]$/.test(frase) ? frase : `${frase}.`;
}

/**
 * Divide em frases em `.`, `!`, `?` seguidos de espaço, sem cortar "R$ 1.500,00" nem endereços. Abreviações
 * comuns (Sr., Dra., etc.) seguidas de espaço ainda cortariam: por isso o resumo guarda as frases
 * como a empresa escreveu e só pega as primeiras.
 */
function dividirFrases(texto: string): string[] {
  const frases: string[] = [];
  let inicio = 0;
  for (const m of texto.matchAll(/[.!?…]+(?=\s|$)/g)) {
    const fim = (m.index ?? 0) + m[0].length;
    const frase = texto.slice(inicio, fim).trim();
    if (frase) frases.push(frase);
    inicio = fim;
  }
  const resto = texto.slice(inicio).trim();
  if (resto) frases.push(resto);
  return frases;
}

/**
 * Trocas de abertura que não mudam o sentido, só passam o texto para "você". Só atuam no começo da
 * frase, e só nestes padrões; qualquer outra frase fica exatamente como a empresa escreveu.
 */
const ABERTURAS: Array<[RegExp, string]> = [
  [/^(?:o|a)?\s*(?:profissional|colaborador(?:a)?|pessoa|candidato|candidata)\s+(?:ser[áa]\s+)?respons[áa]vel\s+(por|pelo|pela|pelos|pelas)\s+/i, "Você vai ser responsável $1 "],
  [/^(?:o|a)?\s*(?:profissional|colaborador(?:a)?|pessoa|candidato|candidata)\s+(?:vai|ir[áa])\s+/i, "Você vai "],
  [/^ser[áa]\s+respons[áa]vel\s+(por|pelo|pela|pelos|pelas)\s+/i, "Você vai ser responsável $1 "],
  [/^atuar[áa]\s+/i, "Você vai atuar "],
  [/^atua(?:r|ção)\s+(?=n[ao]s?\b)/i, "Você vai atuar "],
];

export function paraVoce(frase: string): string {
  for (const [padrao, troca] of ABERTURAS) {
    if (padrao.test(frase)) return frase.replace(padrao, troca);
  }
  return frase;
}

const LIMITE_DAS_FRASES = 2;
const LIMITE_DE_CARACTERES = 320;

/** O início da descrição, em até duas frases e `LIMITE_DE_CARACTERES`, sempre em frases inteiras. */
export function resumirDescricao(descricao: string | null | undefined): string | null {
  const texto = limpar(descricao);
  if (!texto) return null;

  const escolhidas: string[] = [];
  let tamanho = 0;
  for (const frase of dividirFrases(texto).slice(0, LIMITE_DAS_FRASES)) {
    // A primeira frase entra mesmo que seja longa: cortá-la no meio mudaria o sentido.
    if (escolhidas.length > 0 && tamanho + frase.length > LIMITE_DE_CARACTERES) break;
    escolhidas.push(frase);
    tamanho += frase.length;
  }

  const [primeira, ...demais] = escolhidas;
  return [comPontoFinal(paraVoce(primeira)), ...demais.map(comPontoFinal)].join(" ");
}

/** Itens de uma lista escrita em linhas, `;` ou marcadores (`-`, `•`, `*`, `1.`). */
export function itensDoTexto(texto: string | null | undefined): string[] {
  const bruto = (texto ?? "").replace(/\r/g, "");
  if (!bruto.trim()) return [];

  const emLinhas = bruto
    .split(/\n+/)
    .flatMap((linha) => (linha.includes(";") ? linha.split(";") : [linha]))
    .map((item) =>
      item
        .replace(/^\s*(?:[-–—•*·]|\d+[.)])\s*/, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);

  return emLinhas.map((item) => item.replace(/[;,]+$/, "").trim()).filter(Boolean);
}

function formatarSalario(salario: Vaga["salario"], locale = "pt-BR"): string | null {
  if (salario === null || salario === undefined || salario === "") return null;
  const numero = typeof salario === "number" ? salario : Number(String(salario).replace(",", "."));
  if (Number.isFinite(numero)) {
    // Zero ou negativo é campo sem preencher (o banco guarda o decimal), não "salário de R$ 0".
    return numero > 0 ? numero.toLocaleString(locale, { style: "currency", currency: "BRL" }) : null;
  }
  // Valor que não é número (por exemplo "A combinar"): repete como a empresa escreveu.
  const texto = limpar(String(salario));
  return texto || null;
}

function textoSecao(id: string, titulo: string, texto: string | null): SecaoDoResumo {
  return texto ? { id, titulo, informado: true, tipo: "texto", texto } : { id, titulo, informado: false, tipo: "texto", texto: NAO_INFORMADO };
}

function listaSecao(id: string, titulo: string, itens: string[], observacao?: string): SecaoDoResumo {
  return itens.length > 0
    ? { id, titulo, informado: true, tipo: "lista", itens, observacao }
    : { id, titulo, informado: false, tipo: "texto", texto: NAO_INFORMADO };
}

/** Monta o resumo a partir dos campos da vaga. Só usa o que a empresa preencheu. */
export function montarResumoVaga(vaga: Vaga): ResumoDaVaga {
  const nomeEmpresa = limpar(vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial);
  const local = [limpar(vaga.cidade), limpar(vaga.estado)].filter(Boolean).join(" - ");

  const requisitos = itensDoTexto(vaga.requisitos);
  const atividades = itensDoTexto(vaga.atividades);
  const desejaveis = itensDoTexto(vaga.requisitosDesejaveis);
  const etapas = itensDoTexto(vaga.etapasSelecao);
  const beneficios = itensDoTexto(vaga.beneficios);
  const recursos = (vaga.recursosAcessibilidade ?? []).map((r) => RECURSO[r]).filter(Boolean);
  const detalhesDeAcessibilidade = limpar(vaga.acessibilidade);
  const salario = formatarSalario(vaga.salario);
  const jornada = limpar(vaga.cargaHoraria);
  const publico = vaga.publicoAlvo ? PUBLICO[vaga.publicoAlvo] : null;

  const secoes: SecaoDoResumo[] = [
    textoSecao(
      "cargo",
      "Cargo",
      limpar(vaga.titulo) ? `${limpar(vaga.titulo)}${nomeEmpresa ? `, na empresa ${nomeEmpresa}` : ""}.` : null,
    ),
    // Com as atividades preenchidas pela empresa, o resumo as usa. Sem elas, cai no começo da descrição.
    atividades.length > 0 ? listaSecao("atividades", "O que você vai fazer", atividades) : textoSecao("atividades", "O que você vai fazer", resumirDescricao(vaga.descricao)),
    textoSecao(
      "local",
      "Onde você vai trabalhar",
      vaga.modalidade || local
        ? [vaga.modalidade ? MODALIDADE[vaga.modalidade] : null, local ? `Cidade: ${local}.` : null].filter(Boolean).join(" ")
        : null,
    ),
    // A vaga não diz se o valor é por mês, por hora ou por projeto: o resumo repete só o valor.
    textoSecao("salario", "Salário", salario ? `${salario}, valor informado pela empresa.` : null),
    textoSecao("jornada", "Jornada", jornada ? comPontoFinal(jornada) : null),
    textoSecao("contrato", "Tipo de contrato", vaga.contrato ? CONTRATO[vaga.contrato] : null),
    // Com os desejáveis preenchidos, a empresa separou os dois tipos: os de sempre são os obrigatórios.
    listaSecao(
      "requisitos",
      desejaveis.length > 0 ? "Requisitos obrigatórios" : "O que a empresa pede",
      requisitos,
      requisitos.length > 0 && desejaveis.length === 0 ? "A empresa não separou o que é obrigatório do que é desejável." : undefined,
    ),
    ...(desejaveis.length > 0 ? [listaSecao("desejaveis", "Requisitos desejáveis", desejaveis)] : []),
    listaSecao("beneficios", "Benefícios", beneficios),
    listaSecao(
      "acessibilidade",
      "Recursos de acessibilidade",
      recursos,
      detalhesDeAcessibilidade ? `Detalhes da empresa: ${comPontoFinal(detalhesDeAcessibilidade)}` : undefined,
    ),
    // Sem etapas preenchidas pela empresa, o resumo diz que não foram informadas, sem supor.
    etapas.length > 0 ? listaSecao("etapas", "Etapas da seleção", etapas) : textoSecao("etapas", "Etapas da seleção", null),
  ];

  // Só texto de acessibilidade, sem a lista de recursos: vira texto, não "não informado".
  const acessibilidade = secoes.find((s) => s.id === "acessibilidade");
  if (acessibilidade && !acessibilidade.informado && detalhesDeAcessibilidade) {
    secoes[secoes.indexOf(acessibilidade)] = {
      id: "acessibilidade",
      titulo: "Recursos de acessibilidade",
      informado: true,
      tipo: "texto",
      texto: comPontoFinal(detalhesDeAcessibilidade),
    };
  }

  if (publico) {
    secoes.splice(1, 0, { id: "publico", titulo: "Para quem é a vaga", informado: true, tipo: "texto", texto: publico });
  }

  return { secoes, textoFalado: falarResumo(secoes) };
}

/** O resumo em frases corridas: cada seção vira "Título: conteúdo.", e a lista vira itens separados por vírgula. */
function falarResumo(secoes: SecaoDoResumo[]): string {
  return secoes
    .map((s) => {
      if (s.tipo === "texto") return `${s.titulo}: ${s.texto}`;
      const itens = s.itens.map((i) => i.replace(/[.;,]+$/, "")).join(", ");
      return `${s.titulo}: ${itens}.${s.observacao ? ` ${s.observacao}` : ""}`;
    })
    .join(" ");
}
