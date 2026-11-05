/**
 * Rascunho automático de um formulário de texto longo: guarda o que a pessoa escreveu para ela não
 * perder tudo se a sessão cair, a aba fechar ou o diálogo for fechado sem querer.
 *
 * Cuidados de privacidade, todos testados:
 * - só os campos de uma **lista permitida** (`campos`) entram, nunca senha, e-mail, telefone,
 *   documentos ou datas de nascimento;
 * - fica só neste navegador (`localStorage`) e **vence em 24 horas**;
 * - só é guardado o que a pessoa **mudou** em relação ao valor que o campo já tinha;
 * - o rascunho nunca é aplicado sozinho: o formulário oferece "Restaurar" e "Descartar";
 * - sai ao salvar com sucesso, ao descartar e ao vencer.
 */

export const PREFIXO_DO_RASCUNHO = "acesso:rascunho:";
/** 24 horas, em milissegundos. */
export const VALIDADE_DO_RASCUNHO = 24 * 60 * 60 * 1000;

export type Rascunho = { salvoEm: number; valores: Record<string, string> };

function chaveDe(chave: string): string {
  return `${PREFIXO_DO_RASCUNHO}${chave}`;
}

function ehRascunho(valor: unknown): valor is Rascunho {
  if (!valor || typeof valor !== "object") return false;
  const v = valor as Record<string, unknown>;
  if (typeof v.salvoEm !== "number" || !v.valores || typeof v.valores !== "object") return false;
  return Object.values(v.valores as Record<string, unknown>).every((x) => typeof x === "string");
}

/** O rascunho guardado, ou `null` se não há, se venceu ou se está corrompido (e então é apagado). */
export function lerRascunho(chave: string, agora = Date.now()): Rascunho | null {
  try {
    const bruto = window.localStorage.getItem(chaveDe(chave));
    if (!bruto) return null;
    const dados: unknown = JSON.parse(bruto);
    if (!ehRascunho(dados) || agora - dados.salvoEm > VALIDADE_DO_RASCUNHO || agora < dados.salvoEm) {
      window.localStorage.removeItem(chaveDe(chave));
      return null;
    }
    return dados;
  } catch {
    return null;
  }
}

export function apagarRascunho(chave: string): void {
  try {
    window.localStorage.removeItem(chaveDe(chave));
  } catch {
    /* Sem localStorage, não há rascunho para apagar. */
  }
}

type CampoDeTexto = HTMLInputElement | HTMLTextAreaElement;

function camposDe(form: HTMLFormElement, permitidos: readonly string[]): CampoDeTexto[] {
  return permitidos
    .map((nome) => form.elements.namedItem(nome))
    .filter((el): el is CampoDeTexto => el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type === "text"));
}

/**
 * O que a pessoa mudou nos campos permitidos, em relação ao valor inicial de cada campo
 * (`defaultValue`). Campo vazio ou igual ao inicial não entra.
 */
export function valoresAlterados(form: HTMLFormElement, permitidos: readonly string[]): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const campo of camposDe(form, permitidos)) {
    if (campo.value.trim() && campo.value !== campo.defaultValue) valores[campo.name] = campo.value;
  }
  return valores;
}

/** Guarda o que mudou; se nada mudou, apaga o rascunho. Devolve `true` quando guardou algo. */
export function salvarRascunho(chave: string, form: HTMLFormElement, permitidos: readonly string[], agora = Date.now()): boolean {
  const valores = valoresAlterados(form, permitidos);
  if (Object.keys(valores).length === 0) {
    apagarRascunho(chave);
    return false;
  }
  try {
    window.localStorage.setItem(chaveDe(chave), JSON.stringify({ salvoEm: agora, valores } satisfies Rascunho));
    return true;
  } catch {
    return false;
  }
}

/**
 * Coloca o rascunho nos campos do formulário (só os permitidos que existem nele) e devolve quantos
 * foram preenchidos. Dispara `input` em cada um, para quem escuta o formulário (inclusive o próprio
 * rascunho) ver a mudança.
 */
export function aplicarRascunho(form: HTMLFormElement, rascunho: Rascunho, permitidos: readonly string[]): number {
  let aplicados = 0;
  for (const campo of camposDe(form, permitidos)) {
    const valor = rascunho.valores[campo.name];
    if (typeof valor !== "string") continue;
    campo.value = valor;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    aplicados++;
  }
  return aplicados;
}

/** "agora há pouco", "há 12 minutos", "há 3 horas": só para o aviso do rascunho. */
export function haQuantoTempo(salvoEm: number, agora = Date.now()): string {
  const minutos = Math.max(0, Math.floor((agora - salvoEm) / 60_000));
  if (minutos < 1) return "agora há pouco";
  if (minutos < 60) return `há ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.floor(minutos / 60);
  return `há ${horas} ${horas === 1 ? "hora" : "horas"}`;
}
