/** Nomes em português dos valores da API (os mesmos do app Android, Rotulos.java e textos.xml). */

export const MODALIDADES = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' } as const;

export const CONTRATOS = {
  clt: 'CLT',
  pj: 'PJ',
  estagio: 'Estágio',
  jovem_aprendiz: 'Jovem aprendiz',
  temporario: 'Temporário',
} as const;

export const PUBLICOS = {
  geral: 'Todos os públicos',
  pcd: 'Exclusiva PCD',
  cinquenta_mais: 'Exclusiva 50+',
  pcd_cinquenta_mais: 'PCD e 50+',
} as const;

export const PORTES = { mei: 'MEI', micro: 'Microempresa', pequena: 'Pequena', media: 'Média', grande: 'Grande' } as const;

export const RECURSOS = {
  interprete_libras: 'Intérprete de Libras',
  tecnologia_assistiva: 'Tecnologia assistiva',
  ambiente_fisico_acessivel: 'Ambiente físico acessível',
  banheiro_adaptado: 'Banheiro adaptado',
  elevador_rampa: 'Elevador ou rampa de acesso',
  jornada_adaptavel: 'Jornada adaptável',
  ferramentas_digitais_acessiveis: 'Ferramentas digitais acessíveis',
  outro: 'Outro recurso (ver descrição)',
} as const;

export const STATUS_EMPRESA = {
  aprovada: 'aprovada',
  pendente: 'em análise',
  reprovada: 'não aprovada',
  suspensa: 'suspensa',
} as const;

export const STATUS_CANDIDATURA = {
  pendente: 'enviada',
  visualizada: 'visualizada pela empresa',
  em_analise: 'em análise',
  aprovada: 'aprovada',
  rejeitada: 'não selecionada',
  cancelada: 'cancelada',
} as const;

export const STATUS_VAGA = { aberta: 'Aberta', pausada: 'Pausada', encerrada: 'Encerrada' } as const;

/** Nome do valor na tabela, ou null se for desconhecido (a tela não mostra código cru). */
export function rotulo<T extends Record<string, string>>(tabela: T, valor: string | null | undefined): string | null {
  return valor && Object.prototype.hasOwnProperty.call(tabela, valor) ? tabela[valor as keyof T] : null;
}

/** Contador curto para selos: 0–99 ou "99+". */
export function contador(total: number): string {
  return total > 99 ? '99+' : String(total);
}

/** Iniciais para o avatar sem foto: "Joana Exemplo" → "JE". */
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '?';
  }
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function primeiroNome(nome: string | null | undefined): string | null {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  return partes[0] ?? null;
}
