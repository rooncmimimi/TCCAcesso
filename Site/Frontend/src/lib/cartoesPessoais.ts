/**
 * Cartões de comunicação criados pela própria pessoa. Ficam só neste navegador (localStorage): não
 * vão para o servidor, não são vistos por empresas e somem se os dados do navegador forem limpos.
 * Toda leitura e gravação tolera armazenamento indisponível ou conteúdo corrompido.
 */

export const CHAVE_DOS_CARTOES = "acesso:cartoes-comunicacao";
export const MAXIMO_DE_CARTOES = 24;
export const TAMANHO_MAXIMO_DO_CARTAO = 140;

export type CartaoPessoal = { id: string; texto: string };

const limpar = (texto: string) => texto.replace(/\s+/g, " ").trim();

export function lerCartoesPessoais(): CartaoPessoal[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE_DOS_CARTOES);
    const lista: unknown = bruto ? JSON.parse(bruto) : [];

    if (!Array.isArray(lista)) return [];

    return lista
      .filter((c): c is CartaoPessoal => Boolean(c) && typeof c === "object" && typeof (c as CartaoPessoal).id === "string" && typeof (c as CartaoPessoal).texto === "string")
      .map((c) => ({ id: c.id, texto: limpar(c.texto).slice(0, TAMANHO_MAXIMO_DO_CARTAO) }))
      .filter((c) => c.texto.length > 0)
      .slice(0, MAXIMO_DE_CARTOES);
  } catch {
    return [];
  }
}

function gravar(lista: CartaoPessoal[]): boolean {
  try {
    window.localStorage.setItem(CHAVE_DOS_CARTOES, JSON.stringify(lista));

    return true;
  } catch {
    return false;
  }
}

export type ResultadoDeAdicionar = { ok: true; lista: CartaoPessoal[] } | { ok: false; motivo: string };

export function adicionarCartaoPessoal(textoBruto: string): ResultadoDeAdicionar {
  const texto = limpar(textoBruto);
  const atual = lerCartoesPessoais();

  if (!texto) return { ok: false, motivo: "Escreva a frase do cartão." };
  if (texto.length > TAMANHO_MAXIMO_DO_CARTAO) return { ok: false, motivo: `O cartão aceita até ${TAMANHO_MAXIMO_DO_CARTAO} caracteres.` };
  if (atual.length >= MAXIMO_DE_CARTOES) return { ok: false, motivo: `Você já tem ${MAXIMO_DE_CARTOES} cartões. Remova um para criar outro.` };
  if (atual.some((c) => c.texto.toLowerCase() === texto.toLowerCase())) return { ok: false, motivo: "Você já tem um cartão com esta frase." };

  const lista = [...atual, { id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, texto }];

  if (!gravar(lista)) return { ok: false, motivo: "Este navegador não deixou guardar o cartão (armazenamento bloqueado)." };

  return { ok: true, lista };
}

export function removerCartaoPessoal(id: string): CartaoPessoal[] {
  const lista = lerCartoesPessoais().filter((c) => c.id !== id);

  gravar(lista);

  return lista;
}
