/** Formatação de textos, igual à do app Android (LeitoresConteudoApi e Mascaras). */

/** "há 2 horas", "ontem", "há 3 meses"... `agora` em milissegundos. */
export function tempoRelativo(iso: string | null | undefined, agora: number = Date.now()): string {
  if (!iso) {
    return '';
  }
  const momento = Date.parse(iso);
  if (Number.isNaN(momento)) {
    return '';
  }
  const minutos = Math.max(0, Math.floor((agora - momento) / 60_000));
  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(meses / 12);
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

/** DECIMAL(10,2) chega como texto ("3500.00"): vira "R$ 3.500,00". Valor inválido ou zero fica de fora. */
export function moeda(valor: string | number | null | undefined): string | null {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return null;
  }
  const numero = Number(String(valor).trim());
  if (!Number.isFinite(numero) || numero <= 0) {
    return null;
  }
  const [inteiro, centavos] = numero.toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function mesAno(data: string | null | undefined): string | null {
  const partes = data?.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (!partes) {
    return null;
  }
  const mes = Number(partes[2]);
  return mes >= 1 && mes <= 12 ? `${MESES[mes - 1]}/${partes[1]}` : null;
}

/** "2020-03-01" e "2022-11-30" → "mar/2020 – nov/2022"; em andamento → "mar/2020 – atual". */
export function periodo(inicio: string | null | undefined, fim: string | null | undefined, atual: boolean): string | null {
  const textoInicio = mesAno(inicio);
  const textoFim = atual ? 'atual' : mesAno(fim);
  if (!textoInicio) {
    return textoFim;
  }
  return textoFim ? `${textoInicio} – ${textoFim}` : textoInicio;
}

/** Junta dois textos com " · ", ignorando os vazios. */
export function juntar(a: string | null | undefined, b: string | null | undefined, separador = ' · '): string | null {
  const temA = !!a && a.trim() !== '';
  const temB = !!b && b.trim() !== '';
  if (temA && temB) return `${a!.trim()}${separador}${b!.trim()}`;
  if (temA) return a!.trim();
  return temB ? b!.trim() : null;
}

/** "São Paulo - SP" */
export function local(cidade: string | null | undefined, estado: string | null | undefined): string | null {
  return juntar(cidade, estado, ' - ');
}

// --- Máscaras de digitação ---

/** "25092000" → "25/09/2000" */
export function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "11987654321" → "(11) 98765-4321"; fixo com 10 dígitos → "(11) 3456-7890" */
export function mascaraTelefone(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const ddd = `(${d.slice(0, 2)}) `;
  const resto = d.slice(2);
  if (resto.length <= 4) return ddd + resto;
  const corte = d.length === 11 ? 5 : 4;
  return `${ddd}${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/** "12345678909" → "123.456.789-09" */
export function mascaraCpf(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
