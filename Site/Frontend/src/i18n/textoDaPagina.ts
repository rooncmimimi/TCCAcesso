import { DICIONARIOS, type ChaveBase } from "./dicionarios";
import { lerIdiomaEscolhido } from "./armazenamento";
import { idiomaDoNavegador, type CodigoIdioma } from "./idiomas";
import { traduzir, type Variaveis } from "./traduzir";

/**
 * O idioma de agora, lido direto do aparelho — sem React.
 *
 * Mesma regra do `IdiomaProvider`: a escolha da pessoa manda; sem escolha, o idioma do navegador, se for um dos três.
 * Quem chama não está dentro da árvore do React e por isso não tem o contexto para perguntar.
 */
export function idiomaDeAgora(): CodigoIdioma {
  return lerIdiomaEscolhido() ?? idiomaDoNavegador();
}

/**
 * Traduz fora da árvore do React.
 *
 * O `head()` de cada rota é o motivo de isto existir: o roteador o chama para montar o `<title>` e as `<meta>` ANTES de
 * renderizar a tela, onde nenhum hook funciona. O título da aba é a primeira coisa que um leitor de tela anuncia ao abrir
 * a página, então deixá-lo em português num site em espanhol não é um detalhe de SEO.
 *
 * O idioma é lido a cada chamada, e não guardado: `head()` roda de novo a cada navegação, e o `AppFrame` manda o roteador
 * recalcular quando a pessoa troca o idioma com a página aberta.
 */
export function textoDaPagina(chave: ChaveBase, vars?: Variaveis): string {
  const idioma = idiomaDeAgora();

  return traduzir(DICIONARIOS[idioma], idioma, chave, vars);
}
