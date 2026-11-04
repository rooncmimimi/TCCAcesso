/**
 * Histórico de instruções: explicações e orientações que a pessoa escolheu guardar para consultar
 * depois (resumo de uma vaga, "Explique esta página", um termo do glossário, "Onde estou?").
 *
 * Fica só neste navegador (`localStorage`), nunca vai ao servidor, e só guarda o que a pessoa mandou
 * salvar: texto de orientação do próprio Site, nunca dados digitados em formulários. Tem limite de
 * itens e de tamanho, e a pessoa apaga um item ou tudo quando quiser.
 */

export type InstrucaoSalva = {
  id: string;
  titulo: string;
  texto: string;
  /** ISO 8601 de quando foi salva. */
  salvaEm: string;
};

export const CHAVE_HISTORICO = "acesso:historico-instrucoes";
export const LIMITE_DE_ITENS = 50;
export const LIMITE_DO_TEXTO = 4000;
export const LIMITE_DO_TITULO = 160;

function ehInstrucao(valor: unknown): valor is InstrucaoSalva {
  if (!valor || typeof valor !== "object") return false;
  const v = valor as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.titulo === "string" && typeof v.texto === "string" && typeof v.salvaEm === "string";
}

/** Lê o histórico; um conteúdo corrompido ou de outro formato vira lista vazia, nunca um erro. */
export function lerHistorico(): InstrucaoSalva[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE_HISTORICO);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(ehInstrucao) : [];
  } catch {
    return [];
  }
}

function gravar(itens: InstrucaoSalva[]): boolean {
  try {
    window.localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(itens));
    // `storage` só dispara em outras abas: avisa esta também, para a tela atualizar.
    window.dispatchEvent(new Event(EVENTO_DO_HISTORICO));
    return true;
  } catch {
    return false;
  }
}

export const EVENTO_DO_HISTORICO = "acesso:historico-instrucoes:mudou";

function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cortar(texto: string, limite: number): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1).trimEnd()}…`;
}

/**
 * Guarda uma instrução. Repetir o mesmo título e texto só sobe o item para o topo (sem duplicar).
 * Passando do limite, os mais antigos saem. Devolve `false` se o navegador não deixou gravar.
 */
export function salvarInstrucao(entrada: { titulo: string; texto: string }): boolean {
  const titulo = cortar(entrada.titulo, LIMITE_DO_TITULO);
  const texto = cortar(entrada.texto, LIMITE_DO_TEXTO);
  if (!titulo || !texto) return false;

  const existentes = lerHistorico().filter((i) => !(i.titulo === titulo && i.texto === texto));
  const novo: InstrucaoSalva = { id: novoId(), titulo, texto, salvaEm: new Date().toISOString() };
  return gravar([novo, ...existentes].slice(0, LIMITE_DE_ITENS));
}

export function removerInstrucao(id: string): boolean {
  return gravar(lerHistorico().filter((i) => i.id !== id));
}

export function limparHistorico(): boolean {
  try {
    window.localStorage.removeItem(CHAVE_HISTORICO);
    window.dispatchEvent(new Event(EVENTO_DO_HISTORICO));
    return true;
  } catch {
    return false;
  }
}

/** `entrada` já está em `itens`? Compara do mesmo jeito que `salvarInstrucao` guarda (texto normalizado). */
export function contemInstrucao(itens: InstrucaoSalva[], entrada: { titulo: string; texto: string }): boolean {
  const titulo = cortar(entrada.titulo, LIMITE_DO_TITULO);
  const texto = cortar(entrada.texto, LIMITE_DO_TEXTO);
  return itens.some((i) => i.titulo === titulo && i.texto === texto);
}
