import type { Vaga } from "../vagas";

export function formatarDataPorExtenso(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

// O Sequelize serializa decimal como string, então o valor pode chegar como "3500.00".
export function formatarSalario(valor: Vaga["salario"]): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

/** "agora", "há 4 min", "há 2h", "há 3 d" e, a partir de uma semana, a data curta: mesmo formato do Site. */
export function formatarTempoRelativo(valor: string | null | undefined): string {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";

  const diffMin = Math.floor((Date.now() - data.getTime()) / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras}h`;

  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 7) return `há ${diffDias} d`;

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(data);
}

export function formatarMesAno(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(data);
}
