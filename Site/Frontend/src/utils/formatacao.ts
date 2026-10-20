/**
 * Funções utilitárias de formatação usadas na interface.
 */

import { dic, localeDoIdioma, obterIdioma } from "@/i18n";
import type { PorteEmpresa } from "@/types";

/**
 * Os formatadores seguem o idioma escolhido no Site (`@/i18n`). São criados sob demanda e guardados
 * por região, porque o idioma pode mudar com a página aberta: um formatador fixo no carregamento do
 * módulo ficaria preso ao idioma daquela hora.
 */
const cacheFormatadores = new Map<string, object>();

function formatadorDe<T extends object>(
  chave: string,
  criar: (locale: string) => T,
): T {
  const locale = localeDoIdioma(obterIdioma());
  const completa = `${locale}|${chave}`;
  let formatador = cacheFormatadores.get(completa) as T | undefined;
  if (!formatador) {
    formatador = criar(locale);
    cacheFormatadores.set(completa, formatador);
  }
  return formatador;
}

const formatadorMoeda = () =>
  formatadorDe("moeda", (locale) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
  );

const formatadorData = () =>
  formatadorDe("data", (locale) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }));

const formatadorDataCurta = () =>
  formatadorDe("data-curta", (locale) =>
    new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }),
  );

const formatadorHoraCurta = () =>
  formatadorDe("hora-curta", (locale) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }));

/** Formata um salário em reais; retorna "A combinar" (no idioma atual) quando não informado. */
export function formatarSalario(valor?: number | null): string {
  if (valor === null || valor === undefined) return dic().comum.aCombinar;
  return formatadorMoeda().format(valor);
}

/**
 * Formata uma data ISO por extenso, no padrão do idioma atual.
 *
 * Uma data pura (`AAAA-MM-DD`, sem hora, como o `dataInicio` de uma experiência ou
 * `dataNascimento`) representa um dia de calendário, não um instante: `new Date("2021-01-01")` a
 * interpreta como meia-noite em UTC, e formatar num fuso atrás de UTC (todo o Brasil) mostraria "31
 * de dezembro de 2020", um dia a menos. Por isso datas puras são montadas a partir de ano, mês e
 * dia direto no fuso local, sem passar por UTC. Timestamps completos (`criadoEm`, `criadoEm`, com
 * hora e fuso) seguem o caminho normal, porque esses precisam mesmo da conversão.
 */
export function formatarData(data?: string | Date | null): string {
  if (!data) return "";

  let referencia: Date;
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split("-").map(Number);
    referencia = new Date(ano, mes - 1, dia);
  } else {
    referencia = typeof data === "string" ? new Date(data) : data;
  }

  if (Number.isNaN(referencia.getTime())) return "";
  return formatadorData().format(referencia);
}

/**
 * Data e hora no formato "31/08/2026 às 14:32", para as telas administrativas que precisam mostrar
 * quando algo aconteceu. É o único lugar que formata data e hora juntas.
 */
export function formatarDataHora(data?: string | Date | null): string {
  if (!data) return "";
  const referencia = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(referencia.getTime())) return "";
  return dic().comum.dataHora(formatadorDataCurta().format(referencia), formatadorHoraCurta().format(referencia));
}

/** Retorna uma descrição relativa acessível, como "há 3 dias". */
export function formatarTempoRelativo(data?: string | Date | null): string {
  if (!data) return "";
  const referencia = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(referencia.getTime())) return "";

  const segundos = Math.round((referencia.getTime() - Date.now()) / 1000);
  const unidades: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  const formatador = formatadorDe("relativo", (locale) => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }));

  for (const [unidade, fator] of unidades) {
    if (Math.abs(segundos) >= fator) {
      return formatador.format(Math.round(segundos / fator), unidade);
    }
  }

  return dic().comum.agoraMesmo;
}

/** Data por extenso ("14 de outubro de 2026"), ou "—" quando vazia ou inválida. */
export function formatarDataLonga(iso?: string | null): string {
  if (!iso) return dic().comum.semValor;
  const referencia = new Date(iso);
  if (Number.isNaN(referencia.getTime())) return dic().comum.semValor;
  return formatadorDe("data-longa", (locale) => new Intl.DateTimeFormat(locale, { dateStyle: "long" })).format(referencia);
}

/** Data e hora curtas, no idioma atual. Devolve o texto original quando a data é inválida. */
export function formatarDataHoraCurta(iso: string): string {
  const referencia = new Date(iso);
  if (Number.isNaN(referencia.getTime())) return iso;
  return formatadorDe("data-hora-curta", (locale) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }),
  ).format(referencia);
}

/** Hora e minuto, no idioma atual (ex.: "14:05" ou "2:05 PM"). */
export function formatarHoraCurta(data: string | Date): string {
  return formatadorHoraCurta().format(new Date(data));
}

/** Dia e mês, no idioma atual (ex.: "20/10" ou "10/20"). */
export function formatarDiaMes(data: string | Date): string {
  return formatadorDe("dia-mes", (locale) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" })).format(
    new Date(data),
  );
}

/** Só a data, no padrão do idioma atual (`toLocaleDateString`). */
export function formatarDataLocal(data: string | Date): string {
  return new Date(data).toLocaleDateString(localeDoIdioma(obterIdioma()));
}

/** Data e hora, no padrão do idioma atual (`toLocaleString`). */
export function formatarDataHoraLocal(data: string | Date): string {
  return new Date(data).toLocaleString(localeDoIdioma(obterIdioma()));
}

/** Gera as iniciais de um nome para uso em avatares. */
export function iniciaisDoNome(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

/** Formata um tamanho de arquivo em bytes de forma legível (ex.: "1,2 MB"). */
export function formatarTamanhoArquivo(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let indice = 0;
  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }
  return `${valor.toFixed(valor >= 10 || indice === 0 ? 0 : 1)} ${unidades[indice]}`;
}

/**
 * Portes de empresa, na ordem do menor para o maior.
 *
 * O banco guarda o valor cru (`media`); o nome mostrado vem do dicionário (`comum.portes`). A lista
 * fica aqui, e não em cada tela, porque o cadastro e a edição do perfil da empresa precisam oferecer
 * exatamente as mesmas opções na mesma ordem.
 */
export const PORTES_EMPRESA: { valor: PorteEmpresa }[] = [
  { valor: "mei" },
  { valor: "micro" },
  { valor: "pequena" },
  { valor: "media" },
  { valor: "grande" },
];
