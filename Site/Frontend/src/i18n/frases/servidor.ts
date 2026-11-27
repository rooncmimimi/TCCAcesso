/**
 * Textos que o servidor escreve em português (erros, notificações, rótulos de catálogos) no idioma do
 * site.
 *
 * O servidor não muda: o banco guarda a frase como foi escrita, e a tradução acontece na chegada.
 * `{0}` marca o trecho que varia (um nome, um número, o título de uma vaga) e passa como veio — só os
 * valores que o próprio sistema escreve ("Em análise", "2 curtidas") são traduzidos também.
 * Frase que não está na tabela aparece em português: `servidor.test.ts` cobra a tradução das novas.
 */
import { frase, idiomaDasFrases } from "./index";
import { FRASES_DO_SERVIDOR } from "./servidor.dados";

type Idioma = "en" | "es";
type Molde = { re: RegExp; vagas: number[]; destino: string; peso: number };

const preparadas = new Map<Idioma, { exatas: Map<string, string>; moldes: Molde[] }>();

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function preparar(idioma: Idioma) {
  let pronta = preparadas.get(idioma);
  if (pronta) return pronta;

  const exatas = new Map<string, string>();
  const moldes: Molde[] = [];
  for (const [pt, en, es] of FRASES_DO_SERVIDOR) {
    const destino = idioma === "en" ? en : es;
    if (!/\{\d\}/.test(pt)) {
      exatas.set(pt, destino);
      continue;
    }
    const vagas = [...pt.matchAll(/\{(\d)\}/g)].map((m) => Number(m[1]));
    const re = new RegExp(`^${pt.split(/\{\d\}/).map(escapar).join("([\\s\\S]*?)")}$`);
    moldes.push({ re, vagas, destino, peso: pt.replace(/\{\d\}/g, "").length });
  }
  // A frase com mais texto fixo primeiro: "{0} comentou: {1}" não pode engolir uma mais específica.
  moldes.sort((a, b) => b.peso - a.peso);

  pronta = { exatas, moldes };
  preparadas.set(idioma, pronta);
  return pronta;
}

/** Um trecho variável: traduz só o que o próprio sistema escreve; nome e texto de pessoa ficam como vieram. */
function valor(trecho: string, idioma: Idioma): string {
  return trecho
    .split("; ")
    .map((parte) => {
      const { exatas } = preparar(idioma);
      const exata = exatas.get(parte);
      if (exata !== undefined) return exata;
      const contagem = /^(\d+) (\p{L}+)$/u.exec(parte);
      const molde = contagem && exatas.get(contagem[2]);
      if (contagem && molde) return `${contagem[1]} ${molde}`;
      return VALORES_DO_SISTEMA.has(parte) ? frase(parte, idioma) : parte;
    })
    .join("; ");
}

/** Situações que o servidor encaixa no meio de uma frase. */
const VALORES_DO_SISTEMA = new Set([
  "Aprovada",
  "Em análise",
  "Visualizada",
  "Rejeitada",
  "Cancelada",
  "aberta",
  "pausada",
  "encerrada",
  "resolvida",
  "descartada",
]);

/** A frase do servidor no idioma do site; o que não for conhecido volta como veio. */
export function doServidor(texto: string): string {
  const idioma = idiomaDasFrases();
  if (idioma === "pt" || !texto) return texto;

  const { exatas, moldes } = preparar(idioma);
  const exata = exatas.get(texto);
  if (exata !== undefined) return exata;

  for (const molde of moldes) {
    const achado = molde.re.exec(texto);
    if (!achado) continue;
    const partes: string[] = [];
    molde.vagas.forEach((vaga, i) => (partes[vaga] = valor(achado[i + 1], idioma)));
    return molde.destino.replace(/\{(\d)\}/g, (_, n) => partes[Number(n)] ?? "");
  }

  return frase(texto, idioma);
}

/** Campos que o servidor preenche com texto próprio, por endereço da API. */
function camposDe(url: string): Set<string> {
  const campos = new Set(["rotulo"]);
  if (url.includes("/notificacoes")) campos.add("titulo").add("descricao");
  if (url.includes("/admin/logs")) campos.add("descricao");
  if (url.includes("/seguir/sugestoes")) campos.add("motivo");
  return campos;
}

function percorrer(dado: unknown, campos: Set<string>): unknown {
  if (Array.isArray(dado)) return dado.map((item) => percorrer(item, campos));
  if (!dado || typeof dado !== "object" || Object.getPrototypeOf(dado) !== Object.prototype) return dado;
  return Object.fromEntries(
    Object.entries(dado).map(([chave, conteudo]) => [
      chave,
      typeof conteudo === "string" && campos.has(chave) ? doServidor(conteudo) : percorrer(conteudo, campos),
    ]),
  );
}

/**
 * Traduz, na resposta da API, só os campos que são texto do sistema. A `descricao` de uma vaga ou o
 * `titulo` de um certificado são de quem escreveu e não passam por aqui.
 */
export function respostaDoServidor<T>(url: string, dado: T): T {
  if (idiomaDasFrases() === "pt") return dado;
  return percorrer(dado, camposDe(url)) as T;
}
