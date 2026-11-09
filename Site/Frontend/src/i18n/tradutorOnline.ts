import { ErroDeTraducao, type MotorDeTraducao } from "./tradutorDoNavegador";
import type { CodigoIdioma } from "./idiomas";

/**
 * Tradução por um serviço gratuito na internet (MyMemory), para quando o tradutor embutido do navegador
 * não está disponível — que, na prática, é quase sempre.
 *
 * **O texto sai do aparelho.** Este motor manda o trecho a traduzir para um serviço de terceiros. É uma
 * escolha consciente: sem ele, o botão "Traduzir" não traduzia em navegador nenhum. Por isso a pessoa
 * confirma antes da primeira vez (ver `ConsentimentoDeTraducaoDialog`) e a tela diz, depois, que a
 * tradução veio de um serviço online.
 *
 * O pedido sai **do navegador de quem lê**, não do servidor do ACESSO: o limite gratuito é por endereço
 * de internet, então cada pessoa tem a sua cota em vez de todo mundo dividir a do servidor, e o ACESSO
 * não passa a ver o que cada pessoa traduz. Sem chave, sem cadastro, sem e-mail: nada identifica quem
 * pediu além do endereço de internet que qualquer site já vê.
 */

const ENDERECO = "https://api.mymemory.translated.net/get";

/** O serviço recusa pedidos acima de 500 bytes. Com folga, para a conta nunca estourar por acento. */
export const LIMITE_DE_BYTES = 450;

/** Teto de pedidos por tradução: um texto gigante não vira dezenas de chamadas ao serviço. */
export const MAXIMO_DE_PEDACOS = 24;

export const LIMITE_DO_PEDIDO_MS = 15_000;

const bytes = (texto: string) => new TextEncoder().encode(texto).length;

/** Onde dá para cortar sem partir uma frase no meio, da melhor para a pior opção. */
const CORTES = [/\n/g, /[.!?…](?=\s)/g, /[;:,](?=\s)/g, /\s/g];

/** A posição do último corte bom dentro de `janela`, ou 0 se não houver nenhum razoável. */
function melhorCorte(janela: string): number {
  const minimo = Math.floor(janela.length * 0.4);

  for (const padrao of CORTES) {
    let ultimo = 0;

    for (const achado of janela.matchAll(padrao)) ultimo = achado.index + achado[0].length;

    if (ultimo > minimo) return ultimo;
  }

  return 0;
}

/**
 * Parte o texto em pedaços que cabem no limite do serviço, cortando em quebra de linha ou fim de frase
 * sempre que possível. `partirTexto(t).join("")` devolve exatamente `t`: nada se perde nem se duplica.
 */
export function partirTexto(texto: string, limite = LIMITE_DE_BYTES): string[] {
  if (!texto) return [];
  if (bytes(texto) <= limite) return [texto];

  const pedacos: string[] = [];
  let resto = texto;

  while (bytes(resto) > limite) {
    let fim = Math.min(resto.length, limite);

    while (fim > 1 && bytes(resto.slice(0, fim)) > limite) fim -= 1;

    const corte = melhorCorte(resto.slice(0, fim)) || fim;

    pedacos.push(resto.slice(0, corte));
    resto = resto.slice(corte);
  }

  if (resto) pedacos.push(resto);

  return pedacos;
}

/** O serviço devolve `&#39;` e companhia; a tela mostraria os códigos crus. */
export function destrocarEntidades(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, codigo: string) => String.fromCodePoint(Number(codigo)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const AVISO_DE_COTA = /MYMEMORY WARNING|QUOTA|USED ALL AVAILABLE/i;

async function traduzirPedaco(corpo: string, origem: CodigoIdioma, destino: CodigoIdioma): Promise<string> {
  const url = `${ENDERECO}?q=${encodeURIComponent(corpo)}&langpair=${origem}|${destino}`;
  // `AbortController` em vez de `AbortSignal.timeout`, que não existe em todo navegador nem no jsdom dos testes.
  const desistir = new AbortController();
  const relogio = setTimeout(() => desistir.abort(), LIMITE_DO_PEDIDO_MS);

  let resposta: Response;

  try {
    resposta = await fetch(url, { signal: desistir.signal, headers: { Accept: "application/json" } });
  } catch {
    // Sem internet, serviço fora do ar, demora demais, ou um bloqueador de anúncios barrando o pedido.
    throw new ErroDeTraducao("sem_rede");
  } finally {
    clearTimeout(relogio);
  }

  if (resposta.status === 429) throw new ErroDeTraducao("limite_diario");
  if (!resposta.ok) throw new ErroDeTraducao("falhou", `o serviço respondeu ${resposta.status}`);

  const dados: unknown = await resposta.json().catch(() => null);
  const corpoDaResposta = dados as { responseData?: { translatedText?: unknown }; responseStatus?: unknown; responseDetails?: unknown } | null;
  const traduzido = corpoDaResposta?.responseData?.translatedText;
  const estado = Number(corpoDaResposta?.responseStatus);

  if (estado === 403 || (typeof traduzido === "string" && AVISO_DE_COTA.test(traduzido))) throw new ErroDeTraducao("limite_diario");
  if (estado !== 200 || typeof traduzido !== "string" || !traduzido.trim()) {
    throw new ErroDeTraducao("falhou", typeof corpoDaResposta?.responseDetails === "string" ? corpoDaResposta.responseDetails : undefined);
  }

  return destrocarEntidades(traduzido);
}

/** Traduz um texto inteiro, pedaço por pedaço, preservando os espaços e as quebras de linha entre eles. */
async function traduzirTexto(texto: string, origem: CodigoIdioma, destino: CodigoIdioma): Promise<string> {
  if (!texto.trim()) return texto;

  const pedacos = partirTexto(texto);

  if (pedacos.length > MAXIMO_DE_PEDACOS) throw new ErroDeTraducao("texto_longo");

  const saida: string[] = [];

  // Em sequência de propósito: o serviço gratuito limita pedidos simultâneos.
  for (const pedaco of pedacos) {
    const antes = /^\s*/.exec(pedaco)?.[0] ?? "";
    const depois = /\s*$/.exec(pedaco)?.[0] ?? "";
    const corpo = pedaco.slice(antes.length, pedaco.length - depois.length);

    saida.push(corpo ? `${antes}${await traduzirPedaco(corpo, origem, destino)}${depois}` : pedaco);
  }

  return saida.join("");
}

export const tradutorOnline: MotorDeTraducao = {
  // Só depende de haver internet, e disso não dá para ter certeza antes de tentar.
  disponivel: () => true,

  // O serviço não detecta idioma; quem detecta é o palpite local, em `tradutorComReserva`.
  detectar: async () => null,

  async traduzir(textos, origem, destino) {
    const saida: string[] = [];

    for (const texto of textos) saida.push(await traduzirTexto(texto, origem, destino));

    return saida;
  },
};
