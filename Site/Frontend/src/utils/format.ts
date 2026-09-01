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

const formatadorDataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const formatadorHoraCurta = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Formata um salário em reais; retorna "A combinar" quando não informado. */
export function formatarSalario(valor?: number | null): string {
  if (valor === null || valor === undefined) return "A combinar";
  return formatadorMoeda.format(valor);
}

/**
 * Formata uma data ISO no padrão brasileiro por extenso.
 *
 * Uma data "pura" (`AAAA-MM-DD`, sem hora — ex.: `dataInicio` de uma
 * experiência, `dataNascimento`) representa um dia de calendário, não um
 * instante no tempo: `new Date("2021-01-01")` interpreta isso como meia-noite
 * em UTC, e formatar num fuso atrás de UTC (todo o Brasil) exibe "31 de
 * dezembro de 2020" — um dia a menos. Por isso datas puras são montadas a
 * partir dos componentes ano/mês/dia direto no fuso local, sem passar por
 * UTC. Timestamps completos (`criadoEm`, `created_at`, com hora e fuso)
 * continuam pelo caminho normal — aqueles precisam mesmo da conversão.
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
  return formatadorData.format(referencia);
}

/**
 * Formata data + hora absolutas no padrão "31/08/2026 às 14:32" — usado
 * pelas telas administrativas (Fase 8) que precisam mostrar quando algo
 * aconteceu, não só o dia. Substitui as implementações ad-hoc que existiam
 * espalhadas (`PostagensTabela`, `LogsTabela`) — nenhum outro lugar deve
 * formatar data+hora combinadas na mão.
 */
export function formatarDataHora(data?: string | Date | null): string {
  if (!data) return "";
  const referencia = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(referencia.getTime())) return "";
  return `${formatadorDataCurta.format(referencia)} às ${formatadorHoraCurta.format(referencia)}`;
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
