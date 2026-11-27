/**
 * Tradução pela própria frase em português.
 *
 * Os dicionários por chave (`i18n/dicionarios`) continuam sendo o caminho das telas. Isto atende o que
 * não cabe bem em chave: o conteúdo fixo (profissões, glossário, explicações, documentos), as frases
 * montadas em funções, e o que o servidor devolve já escrito em português. O português é a própria
 * chave, então o código continua legível e nada fica em branco: frase sem tradução aparece em
 * português — e `frases.test.ts` falha, para isso não chegar à tela.
 *
 *     tx("Salvar alteração")
 *     tx`Excluir vaga ${vaga.titulo}`          // chave: "Excluir vaga {0}"
 *
 * O idioma é lido a CADA chamada. Por isso `tx` nunca vai solto numa constante de módulo (ficaria preso
 * ao idioma do carregamento): em constante, use um `get`, que é lido na hora de desenhar.
 */
import { lerIdiomaEscolhido } from "@/i18n/armazenamento";
import { localeDe, type CodigoIdioma } from "@/i18n/idiomas";
import { EN } from "./en";
import { ES } from "./es";

const TABELAS: Record<Exclude<CodigoIdioma, "pt">, Readonly<Record<string, string>>> = { en: EN, es: ES };

/** O idioma que o `IdiomaProvider` está mostrando; sem ele (testes, antes de montar), a escolha guardada. */
let idiomaEmUso: CodigoIdioma | null = null;

export function definirIdiomaDasFrases(idioma: CodigoIdioma | null) {
  idiomaEmUso = idioma;
}

export function idiomaDasFrases(): CodigoIdioma {
  return idiomaEmUso ?? lerIdiomaEscolhido() ?? "pt";
}

const preencher = (frase: string, valores: readonly unknown[]) =>
  frase.replace(/\{(\d+)\}/g, (marca, i: string) => (Number(i) < valores.length ? String(valores[Number(i)] ?? "") : marca));

/** O locale ("pt-BR", "en-US", "es-ES") do idioma em uso, para datas, números e ordenação. */
export function localeAtual(): string {
  return localeDe(idiomaDasFrases());
}

/** A frase no idioma pedido, ou ela mesma em português. */
export function frase(portugues: string, idioma: CodigoIdioma = idiomaDasFrases()): string {
  if (idioma === "pt") return portugues;
  return TABELAS[idioma][portugues] ?? portugues;
}

export function tx(portugues: string): string;
export function tx(partes: TemplateStringsArray, ...valores: unknown[]): string;
export function tx(partes: string | TemplateStringsArray, ...valores: unknown[]): string {
  if (typeof partes === "string") return frase(partes);
  const chave = partes.reduce((tudo, parte, i) => (i === 0 ? parte : `${tudo}{${i - 1}}${parte}`), "");
  return preencher(frase(chave), valores);
}
