/**
 * Funções utilitárias de formatação usadas na interface.
 */

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Formata um salário em reais; retorna "A combinar" quando não informado. */
export function formatarSalario(valor?: number | null): string {
  if (valor === null || valor === undefined) return "A combinar";
  return formatadorMoeda.format(valor);
}

/** Formata uma data ISO no padrão brasileiro por extenso. */
export function formatarData(data: string | Date): string {
  const referencia = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(referencia.getTime())) return "";
  return formatadorData.format(referencia);
}

/** Retorna uma descrição relativa acessível, como "há 3 dias". */
export function formatarTempoRelativo(data: string | Date): string {
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

  const formatador = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  for (const [unidade, fator] of unidades) {
    if (Math.abs(segundos) >= fator) {
      return formatador.format(Math.round(segundos / fator), unidade);
    }
  }

  return "agora mesmo";
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
