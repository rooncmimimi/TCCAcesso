import { dicionarioDe } from "@/i18n/dicionario";
import type { Idioma } from "@/i18n/tipos";

/**
 * Termos de Uso e Política de Privacidade do ACESSO.
 *
 * Os textos moram no dicionário de idiomas (`i18n/{pt,en,es}/legal.ts`), onde o português é a
 * versão de referência e `en`/`es` são traduções fiéis. Este arquivo guarda o que não muda de idioma
 * para idioma: a versão aceita e o formato do documento.
 *
 * `VERSAO_DOCUMENTOS` é gravada junto do aceite (`usuarios.termos_versao`): é o que permite saber
 * depois qual texto cada pessoa aceitou. **Mude a versão sempre que mudar o conteúdo** — senão o
 * registro de aceite passa a apontar para um texto que não é mais o que foi aceito. Corrigir uma
 * tradução sem mudar o sentido não exige versão nova; mudar o sentido de um item, em qualquer
 * idioma, exige.
 */
export const VERSAO_DOCUMENTOS = "2026-10-20";

/** Quando `true`, as telas avisam que o documento ainda não vale. */
export const CONTEUDO_PENDENTE = false;

export type Secao = { titulo: string; paragrafos: string[] };
export type ChaveDocumento = "termos" | "privacidade";
export type DocumentoLegal = {
  chave: ChaveDocumento;
  titulo: string;
  resumo: string;
  secoes: Secao[];
};

/** O documento no idioma pedido, já com a versão aplicada ao resumo. */
export function obterDocumento(chave: ChaveDocumento, idioma: Idioma): DocumentoLegal {
  const { titulo, resumo, secoes } = dicionarioDe(idioma).legal[chave];
  return { chave, titulo, resumo: resumo(VERSAO_DOCUMENTOS), secoes };
}
