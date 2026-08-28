/**
 * Cidades brasileiras via API pública do IBGE — usada só para sugerir/
 * autocompletar, nunca como fonte de verdade obrigatória: o campo de
 * cidade continua sendo texto livre em todo o app (ver CidadeAutocomplete).
 *
 * Cache em memória (módulo, não localStorage) — dura a sessão da aba e é
 * compartilhado por todos os formulários, então o IBGE só é consultado uma
 * vez por UF (ou uma vez no total, no modo "todas as cidades do Brasil").
 */
const BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades";

const cachePorUf = new Map<string, string[]>();
let cacheGlobal: string[] | null = null;
let promessaGlobal: Promise<string[]> | null = null;

interface MunicipioIbge {
  nome: string;
}

/** Lista de cidades de uma UF (ex.: "SP") — endpoint leve (poucos KB). */
export async function buscarCidadesPorUf(uf: string): Promise<string[]> {
  const sigla = uf.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(sigla)) return [];

  const emCache = cachePorUf.get(sigla);
  if (emCache) return emCache;

  const resposta = await fetch(`${BASE_URL}/estados/${sigla}/municipios`);
  if (!resposta.ok) throw new Error("Não foi possível carregar as cidades do IBGE.");

  const dados: MunicipioIbge[] = await resposta.json();
  const nomes = dados.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
  cachePorUf.set(sigla, nomes);
  return nomes;
}

/**
 * Todas as cidades do Brasil (~5.500) — endpoint pesado (alguns MB), por
 * isso só deve ser chamado sob demanda (ex.: filtro sem campo de estado),
 * nunca no carregamento da página. Buscado e cacheado uma única vez.
 */
export async function buscarTodasAsCidades(): Promise<string[]> {
  if (cacheGlobal) return cacheGlobal;
  if (promessaGlobal) return promessaGlobal;

  promessaGlobal = fetch(`${BASE_URL}/municipios`)
    .then((resposta) => {
      if (!resposta.ok) throw new Error("Não foi possível carregar as cidades do IBGE.");
      return resposta.json();
    })
    .then((dados: MunicipioIbge[]) => {
      const nomes = [...new Set(dados.map((m) => m.nome))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      cacheGlobal = nomes;
      promessaGlobal = null;
      return nomes;
    })
    .catch((erro) => {
      promessaGlobal = null;
      throw erro;
    });

  return promessaGlobal;
}
