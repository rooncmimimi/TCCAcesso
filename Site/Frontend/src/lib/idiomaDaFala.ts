/**
 * Em que idioma um texto deve ser falado, e qual voz do aparelho fala esse idioma.
 *
 * O idioma da voz acompanha o TEXTO que vai ser lido, não só o idioma escolhido para o site: o site ainda
 * tem telas que não foram traduzidas (o texto na tela fica em português mesmo com o site em inglês), e ler
 * português com uma voz inglesa sai ininteligível. Quando o texto é curto ou ambíguo demais para saber, vale
 * o idioma do site.
 *
 * A detecção é por palavras muito comuns de cada idioma (português, inglês e espanhol, que são os três do
 * site). É uma heurística: acerta frases e parágrafos, não acerta uma palavra solta, e por isso devolve
 * "não sei" (`null`) quando não há evidência suficiente, em vez de chutar.
 *
 * Funções puras, para testar sem navegador.
 */

import { IDIOMA_PADRAO, ehIdioma, localeDe, type CodigoIdioma } from "@/i18n/idiomas";

/** Palavras que, no conjunto, quase só aparecem em um dos três idiomas (as ambíguas, como "de", "a" e "que", ficaram de fora). */
const PALAVRAS: Record<CodigoIdioma, ReadonlySet<string>> = {
  pt: new Set(["não", "você", "vocês", "uma", "um", "com", "em", "é", "são", "está", "estão", "também", "mais", "seu", "sua", "seus", "suas", "dos", "das", "pelo", "pela", "ao", "isso", "aqui", "ou", "nas", "nos", "às", "para", "como", "vaga", "vagas", "sobre", "ainda", "quando", "foi", "ser", "tem", "já", "só", "então", "pessoa", "empresa"]),
  en: new Set(["the", "and", "of", "to", "in", "is", "are", "for", "with", "you", "your", "that", "this", "it", "on", "be", "or", "from", "by", "an", "at", "not", "can", "will", "have", "has", "was", "if", "but", "about", "how", "what", "we", "our", "they", "job", "jobs", "when", "there", "their"]),
  es: new Set(["el", "los", "las", "y", "en", "un", "una", "con", "es", "son", "está", "están", "también", "más", "su", "sus", "del", "al", "lo", "pero", "cuando", "donde", "usted", "ustedes", "hay", "muy", "ya", "para", "como", "sobre", "empleo", "empleos", "persona", "empresa", "esto", "aquí", "ser", "tiene"]),
};

/** Palavras que só um idioma tem: pesam o dobro. */
const PESO_DOBRADO: Record<CodigoIdioma, ReadonlySet<string>> = {
  pt: new Set(["não", "você", "vocês", "é", "são", "também", "mais", "seu", "sua", "dos", "das", "pelo", "pela", "isso", "às", "então", "já", "só"]),
  en: new Set(["the", "and", "of", "is", "are", "with", "your", "that", "this", "from", "have", "has", "was", "about", "what", "they"]),
  es: new Set(["los", "las", "y", "del", "al", "lo", "pero", "cuando", "donde", "usted", "ustedes", "hay", "muy", "ya", "también", "más", "sus", "esto", "aquí"]),
};

/** Palavras comuns que mais de um idioma tem: valem meio ponto (somam para quem as usa, sem decidir sozinhas). */
const PALAVRAS_AMBIGUAS: Record<CodigoIdioma, ReadonlySet<string>> = {
  pt: new Set(["o", "os", "as", "a", "de", "da", "do", "e", "que", "num", "numa"]),
  en: new Set(["a", "as", "do", "so", "no"]),
  es: new Set(["de", "que", "la", "a", "o", "e"]),
};

const MINIMO_DE_PALAVRAS = 3;
const MINIMO_DE_PONTOS = 2;
/** O líder precisa ter pelo menos 1,5 vez os pontos do segundo colocado. */
const VANTAGEM = 1.5;

/** Pontos de um idioma em `palavras`, mais o reforço de letras que só ele usa (ã, õ, ç no português; ñ, ¿, ¡ no espanhol). */
function pontuar(texto: string, palavras: string[]): Record<CodigoIdioma, number> {
  const pontos: Record<CodigoIdioma, number> = { pt: 0, en: 0, es: 0 };

  for (const palavra of palavras) {
    for (const idioma of ["pt", "en", "es"] as const) {
      if (PALAVRAS[idioma].has(palavra)) pontos[idioma] += PESO_DOBRADO[idioma].has(palavra) ? 2 : 1;
      else if (PALAVRAS_AMBIGUAS[idioma].has(palavra)) pontos[idioma] += 0.5;
    }
  }

  pontos.pt += ((texto.match(/[ãõç]/giu) ?? []).length > 0 ? 2 : 0) + ((texto.match(/ão|ões|ções/giu) ?? []).length > 0 ? 1 : 0);
  pontos.es += ((texto.match(/[ñ¿¡]/giu) ?? []).length > 0 ? 3 : 0);

  return pontos;
}

/**
 * O idioma de `texto`, ou `null` se não há evidência suficiente (texto curto, nome próprio, mistura sem
 * predomínio claro). Nunca devolve um idioma que o site não tem.
 */
export function detectarIdiomaDoTexto(texto: string): CodigoIdioma | null {
  const palavras = (texto.toLowerCase().match(/[\p{L}]+/gu) ?? []).filter((p) => p.length > 0);

  if (palavras.length < MINIMO_DE_PALAVRAS && !/[ãõçñ¿¡]/iu.test(texto)) return null;

  const pontos = pontuar(texto, palavras);
  const ordenados = (Object.entries(pontos) as Array<[CodigoIdioma, number]>).sort((a, b) => b[1] - a[1]);
  const [lider, segundo] = ordenados;

  if (lider[1] < MINIMO_DE_PONTOS) return null;
  if (segundo[1] > 0 && lider[1] < segundo[1] * VANTAGEM) return null;

  return lider[0];
}

const LIMITE_DE_TEXTO_DA_TELA = 1500;

/**
 * O idioma da tela em volta de `el`, para quando o texto sozinho é curto demais ("Entrar", "Sobre nós"). Vale, nesta
 * ordem: um `lang` marcado de propósito num ancestral (que não seja o do `<html>`); o idioma do texto do bloco
 * principal onde `el` está (o diálogo aberto, ou o `<main>` da página). `null` se nada disso disser.
 *
 * Existe porque o site ainda tem telas não traduzidas: com o site em inglês, uma tela inteira em português precisa ser
 * lida em português, inclusive os botões curtos.
 */
export function idiomaDaTela(el?: Element | null, doc: Document = document): CodigoIdioma | null {
  const marcado = el?.closest("[lang]");

  if (marcado && marcado !== doc.documentElement) {
    const base = (marcado.getAttribute("lang") ?? "").toLowerCase().split(/[-_]/)[0];

    if (ehIdioma(base)) return base;
  }

  const raiz = el?.closest("main, [role='dialog'], [role='alertdialog']") ?? doc.querySelector("main");
  const texto = (raiz?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITE_DE_TEXTO_DA_TELA);

  return texto ? detectarIdiomaDoTexto(texto) : null;
}

/** O código do idioma do site a partir de `<html lang>` ("en-US" vira "en"); português se não for um dos três. */
export function idiomaDoSite(lang: string | null | undefined = typeof document === "undefined" ? "" : document.documentElement.lang): CodigoIdioma {
  const base = (lang ?? "").toLowerCase().split(/[-_]/)[0];

  return ehIdioma(base) ? base : IDIOMA_PADRAO;
}

/**
 * O idioma em que `texto` deve ser falado: o que ele próprio indica; na dúvida, o da tela em volta de `el` (ver
 * `idiomaDaTela`); e, sem pista nenhuma, o do site.
 */
export function idiomaParaFalar(texto: string, siteLang?: string | null, el?: Element | null): CodigoIdioma {
  return detectarIdiomaDoTexto(texto) ?? idiomaDaTela(el) ?? idiomaDoSite(siteLang);
}

/** O locale BCP 47 para a voz ("pt-BR", "en-US", "es-ES"). */
export function localeParaFalar(texto: string, siteLang?: string | null, el?: Element | null): string {
  return localeDe(idiomaParaFalar(texto, siteLang, el));
}

export type VozEscolhivel = { lang: string; localService: boolean; default: boolean };

const normalizar = (lang: string) => lang.toLowerCase().replace(/_/g, "-");

/**
 * A voz do aparelho que fala `locale`: primeiro as do mesmo locale ("pt-BR"), depois as do mesmo idioma
 * ("pt-PT" serve para português); dentro de cada grupo, a padrão do aparelho, depois as locais (funcionam
 * sem internet e costumam informar as palavras), depois a primeira. `null` se nenhuma fala esse idioma.
 */
export function escolherVoz<V extends VozEscolhivel>(vozes: readonly V[], locale: string): V | null {
  const alvo = normalizar(locale);
  const base = alvo.split("-")[0];
  const melhor = (lista: V[]) => lista.find((v) => v.default) ?? lista.find((v) => v.localService) ?? lista[0] ?? null;

  const mesmoLocale = vozes.filter((v) => normalizar(v.lang) === alvo);

  if (mesmoLocale.length > 0) return melhor(mesmoLocale);

  return melhor(vozes.filter((v) => normalizar(v.lang).split("-")[0] === base));
}
