import { Fragment, type ReactNode } from "react";

const MARCA = /<(\d+)>([\s\S]*?)<\/\1>/g;

/**
 * Separa um texto do dicionário nas suas marcas numeradas e deixa cada parte ser montada por quem chamou.
 *
 *     montarFrase("Abra uma <1>vaga</1>.", [(texto) => <Link to="/vagas">{texto}</Link>])
 *
 * Mora fora de `Frase.tsx` porque é função pura, não componente: o teste a usa direto, e o arquivo do
 * componente fica só com o componente (o recarregamento rápido do Vite depende disso).
 *
 * Marca sem parte correspondente vira texto simples, em vez de sumir: o erro fica visível na tela.
 */
export function montarFrase(texto: string, partes: readonly ((texto: string) => ReactNode)[]): ReactNode[] {
  const pedacos: ReactNode[] = [];
  let posicao = 0;
  let achado: RegExpExecArray | null;

  // O regex é de módulo e guarda `lastIndex` entre chamadas: sem zerar, a segunda montagem do mesmo
  // texto começa no meio e perde a primeira marca.
  MARCA.lastIndex = 0;

  while ((achado = MARCA.exec(texto)) !== null) {
    if (achado.index > posicao) pedacos.push(texto.slice(posicao, achado.index));

    const numero = Number(achado[1]);
    const monta = partes[numero - 1];

    pedacos.push(monta ? monta(achado[2]) : achado[2]);
    posicao = achado.index + achado[0].length;
  }

  if (posicao < texto.length) pedacos.push(texto.slice(posicao));

  return pedacos.map((pedaco, i) => <Fragment key={i}>{pedaco}</Fragment>);
}
