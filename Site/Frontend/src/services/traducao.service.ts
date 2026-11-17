import clienteApi from "./api";

import type { CodigoIdioma } from "@/i18n/idiomas";

export interface RespostaDeTraducao {
  textos: string[];
  /** Quem traduziu, para a tela poder dizer de onde veio. */
  motor: string;
  /** Quantos dos textos já estavam traduzidos no servidor. */
  doCache: number;
}

/**
 * Traduz textos pelo servidor do ACESSO (`POST /traducoes`, público).
 *
 * O servidor guarda o que já traduziu, então o mesmo texto só custa na primeira vez — é por isso que
 * esta chamada passa pelo ACESSO em vez de ir direto ao tradutor de dentro do navegador de cada
 * pessoa. Sem chave de tradução configurada no servidor, responde 503 e quem chama cai para a
 * reserva gratuita.
 */
export async function traduzirTextos(textos: string[], origem: CodigoIdioma, destino: CodigoIdioma): Promise<RespostaDeTraducao> {
  const { data } = await clienteApi.post<RespostaDeTraducao>("/traducoes", { textos, origem, destino });

  return { textos: data.textos, motor: data.motor, doCache: data.doCache };
}

const traducaoService = { traduzir: traduzirTextos };

export default traducaoService;
