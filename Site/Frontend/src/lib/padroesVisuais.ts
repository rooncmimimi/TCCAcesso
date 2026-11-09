import type { ChaveBase } from "@/i18n/dicionarios";
import { hexParaOklch, misturar, oklchParaHex, parLegivel } from "@/lib/cor";

/**
 * Padrões de apresentação visual para daltonismo.
 *
 * **Não são diagnóstico.** São formas de apresentar as cores de estado; quem escolhe é a pessoa,
 * pelo que enxerga melhor, e pode trocar quando quiser.
 *
 * O que um padrão muda são as cores que CARREGAM INFORMAÇÃO (sucesso, erro, alerta, informação) —
 * nunca as fotografias, os logotipos ou a identidade visual do ACESSO. O verde da marca continua
 * sendo o verde da marca em todos os padrões cromáticos; o que sai de cena é o par vermelho-verde
 * como única forma de distinguir "deu certo" de "deu errado".
 *
 * E a cor nunca é a única pista: cada estado tem ícone e texto (ver `StatusBadge`). Um padrão que
 * errasse o matiz ainda deixaria a informação inteira na tela.
 *
 * As cores foram medidas, não escolhidas no olho: cada preenchimento tem no mínimo 4,5:1 com o seu
 * texto (WCAG 1.4.3) e 3:1 com o fundo da página (1.4.11), nos dois temas. `padroesVisuais.test.ts`
 * refaz essa conta a cada execução, então uma cor nova que não passe quebra o teste.
 */

/** Cada papel é uma informação, não uma cor: "deu certo", "deu errado", "cuidado", "para saber". */
export type PapelDeCor = "sucesso" | "erro" | "alerta" | "info" | "destaque";

/** Preenchimento e o texto que vai em cima dele. */
export type ParDeCor = { fundo: string; texto: string };

export type PaletaDoTema = Partial<Record<PapelDeCor, ParDeCor>>;

export type PadraoVisual = {
  id: IdDoPadrao;
  /** Nome curto, como aparece no cartão. */
  nome: ChaveBase;
  /** O que este padrão faz, em uma linha. */
  descricao: ChaveBase;
  /** Por que ele existe, em linguagem simples. */
  explicacao: ChaveBase;
  claro: PaletaDoTema;
  escuro: PaletaDoTema;
};

export const IDS_DOS_PADROES = [
  "nenhum",
  "acessivel",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "monocromatico",
] as const;

export type IdDoPadrao = (typeof IDS_DOS_PADROES)[number];

const BRANCO = "#ffffff";
const ESCURO = "#121212";

/**
 * Azul e laranja no lugar de verde e vermelho: é a troca que resolve os dois tipos mais comuns de
 * daltonismo de uma vez. As cores vêm da paleta de Okabe e Ito, feita para continuar distinguível
 * nesses casos.
 *
 * O amarelo vivo ficou de fora do tema claro: ele mede 1,3:1 contra a página branca, então a borda
 * do selo some. `#a65f00` mantém a leitura de "atenção" e mede 4,9:1 nas duas contas.
 */
const ACESSIVEL: PadraoVisual["claro"] = {
  sucesso: { fundo: "#0072b2", texto: BRANCO },
  erro: { fundo: "#c14300", texto: BRANCO },
  alerta: { fundo: "#a65f00", texto: BRANCO },
  info: { fundo: "#7b3f8f", texto: BRANCO },
};

const ACESSIVEL_ESCURO: PadraoVisual["escuro"] = {
  sucesso: { fundo: "#56b4e9", texto: ESCURO },
  erro: { fundo: "#f08a3c", texto: ESCURO },
  alerta: { fundo: "#f0e442", texto: ESCURO },
  info: { fundo: "#c79bd6", texto: ESCURO },
};

export const PADROES_VISUAIS: Record<Exclude<IdDoPadrao, "nenhum">, PadraoVisual> = {
  acessivel: {
    id: "acessivel",
    nome: "acessibilidade.padroesVisuais.acessivelNome",
    descricao: "acessibilidade.padroesVisuais.acessivelDescricao",
    explicacao: "acessibilidade.padroesVisuais.acessivelExplicacao",
    claro: ACESSIVEL,
    escuro: ACESSIVEL_ESCURO,
  },

  /**
   * Protanopia: o vermelho, além de se confundir com o verde, aparece bem mais escuro. Por isso o
   * erro aqui não é laranja (que puxa para o vermelho), e sim magenta: ele tem azul na composição,
   * então mantém a claridade e se separa do amarelo e do azul.
   */
  protanopia: {
    id: "protanopia",
    nome: "acessibilidade.padroesVisuais.protanopiaNome",
    descricao: "acessibilidade.padroesVisuais.protanopiaDescricao",
    explicacao: "acessibilidade.padroesVisuais.protanopiaExplicacao",
    claro: {
      sucesso: { fundo: "#0072b2", texto: BRANCO },
      erro: { fundo: "#a4036f", texto: BRANCO },
      alerta: { fundo: "#a65f00", texto: BRANCO },
      info: { fundo: "#6b3fa0", texto: BRANCO },
    },
    escuro: {
      sucesso: { fundo: "#56b4e9", texto: ESCURO },
      erro: { fundo: "#e879c0", texto: ESCURO },
      alerta: { fundo: "#f0e442", texto: ESCURO },
      info: { fundo: "#c9a0e8", texto: ESCURO },
    },
  },

  /**
   * Deuteranopia: o verde se confunde com o vermelho, mas a claridade do vermelho continua normal.
   * Dá para manter o laranja no erro; o alerta vai para o âmbar, que se separa bem do laranja.
   */
  deuteranopia: {
    id: "deuteranopia",
    nome: "acessibilidade.padroesVisuais.deuteranopiaNome",
    descricao: "acessibilidade.padroesVisuais.deuteranopiaDescricao",
    explicacao: "acessibilidade.padroesVisuais.deuteranopiaExplicacao",
    claro: {
      sucesso: { fundo: "#0072b2", texto: BRANCO },
      erro: { fundo: "#c14300", texto: BRANCO },
      alerta: { fundo: "#8f6000", texto: BRANCO },
      info: { fundo: "#6b3fa0", texto: BRANCO },
    },
    escuro: {
      sucesso: { fundo: "#56b4e9", texto: ESCURO },
      erro: { fundo: "#f0a050", texto: ESCURO },
      alerta: { fundo: "#f2c14e", texto: ESCURO },
      info: { fundo: "#c9a0e8", texto: ESCURO },
    },
  },

  /**
   * Tritanopia é o contrário dos dois anteriores: azul e amarelo se confundem, e vermelho e verde
   * são vistos normalmente. Então aqui o verde volta a ser o sucesso — e quem sai é o amarelo, que
   * vira magenta, e o azul da informação, que vira um cinza-azulado quase neutro.
   */
  tritanopia: {
    id: "tritanopia",
    nome: "acessibilidade.padroesVisuais.tritanopiaNome",
    descricao: "acessibilidade.padroesVisuais.tritanopiaDescricao",
    explicacao: "acessibilidade.padroesVisuais.tritanopiaExplicacao",
    claro: {
      sucesso: { fundo: "#16772f", texto: BRANCO },
      erro: { fundo: "#c62828", texto: BRANCO },
      alerta: { fundo: "#d81b60", texto: BRANCO },
      info: { fundo: "#37474f", texto: BRANCO },
    },
    escuro: {
      sucesso: { fundo: "#5fd08a", texto: ESCURO },
      erro: { fundo: "#ff8a80", texto: ESCURO },
      alerta: { fundo: "#ff80ab", texto: ESCURO },
      info: { fundo: "#b0bec5", texto: ESCURO },
    },
  },

  /**
   * Monocromático: aqui a cor não distingue nada, e fingir que distingue seria pior. Os quatro
   * estados usam o MESMO preenchimento de propósito — quem separa é o ícone e o texto, que estão
   * sempre lá. O destaque da marca também perde a cor, senão ele seria a única mancha colorida da
   * tela sem querer dizer nada.
   */
  monocromatico: {
    id: "monocromatico",
    nome: "acessibilidade.padroesVisuais.monocromaticoNome",
    descricao: "acessibilidade.padroesVisuais.monocromaticoDescricao",
    explicacao: "acessibilidade.padroesVisuais.monocromaticoExplicacao",
    claro: {
      sucesso: { fundo: "#334155", texto: BRANCO },
      erro: { fundo: "#334155", texto: BRANCO },
      alerta: { fundo: "#334155", texto: BRANCO },
      info: { fundo: "#334155", texto: BRANCO },
      destaque: { fundo: "#334155", texto: BRANCO },
    },
    escuro: {
      sucesso: { fundo: "#cbd5e1", texto: ESCURO },
      erro: { fundo: "#cbd5e1", texto: ESCURO },
      alerta: { fundo: "#cbd5e1", texto: ESCURO },
      info: { fundo: "#cbd5e1", texto: ESCURO },
      destaque: { fundo: "#cbd5e1", texto: ESCURO },
    },
  },
};

/** As variáveis CSS que cada papel comanda. A primeira é o preenchimento; a segunda, o texto. */
const VARIAVEIS: Record<PapelDeCor, { fundo: readonly string[]; texto: readonly string[] }> = {
  sucesso: { fundo: ["--success"], texto: ["--success-foreground"] },
  erro: { fundo: ["--destructive"], texto: ["--destructive-foreground"] },
  alerta: { fundo: ["--warning"], texto: ["--warning-foreground"] },
  info: { fundo: ["--info"], texto: ["--info-foreground"] },
  // O destaque leva junto o contorno de foco: os dois são "a cor com que o site aponta".
  destaque: { fundo: ["--primary", "--primary-strong", "--ring"], texto: ["--primary-foreground"] },
};

/** Toda variável que um padrão PODE escrever — usada para limpar tudo ao voltar para "nenhum". */
export const VARIAVEIS_DOS_PADROES: readonly string[] = Object.values(VARIAVEIS).flatMap((v) => [
  ...v.fundo,
  ...v.texto,
]);

export const PAPEIS: readonly PapelDeCor[] = ["destaque", "sucesso", "erro", "alerta", "info"];

/** O nome de cada papel na tela, para os controles e as amostras. */
export const NOME_DO_PAPEL: Record<PapelDeCor, ChaveBase> = {
  destaque: "acessibilidade.padroesVisuais.papelDestaque",
  sucesso: "acessibilidade.padroesVisuais.papelSucesso",
  erro: "acessibilidade.padroesVisuais.papelErro",
  alerta: "acessibilidade.padroesVisuais.papelAlerta",
  info: "acessibilidade.padroesVisuais.papelInfo",
};

/**
 * As cores que o site já usa, por tema — o ponto de partida de tudo. Espelham o `globals.css`: os
 * valores do tema claro são os hex de lá, e os do escuro são os mesmos hex com a claridade que o
 * bloco `.dark` fixa (`oklch(from #hex 0.72 c h)` e companhia). Se alguém mudar uma cor lá, muda
 * aqui também — `padroesVisuais.test.ts` confere que todas continuam válidas.
 */
const comClaridade = (hex: string, l: number) => oklchParaHex({ ...hexParaOklch(hex), l });

const CORES_DA_MARCA: Record<"claro" | "escuro", Record<PapelDeCor, string>> = {
  claro: {
    destaque: "#16772f",
    sucesso: "#157a33",
    erro: "#d5131c",
    alerta: "#fad905",
    info: "#0a6394",
  },
  escuro: {
    destaque: comClaridade("#21a848", 0.72),
    sucesso: comClaridade("#21a848", 0.72),
    erro: comClaridade("#eb1b25", 0.62),
    alerta: "#fad905",
    info: comClaridade("#0a98e7", 0.72),
  },
};

/**
 * Os ajustes finos, em cima do padrão escolhido.
 *
 * - `intensidade`: 0 deixa a cor da marca como está, 100 usa a cor do padrão inteira, e o meio é
 *   o meio do caminho. Serve para quem quer só "um empurrãozinho".
 * - `saturacao` e `brilho`: multiplicadores em porcentagem (100 = como está).
 * - `contraste`: o contraste MÍNIMO entre o preenchimento e o texto em cima dele. Não é um efeito
 *   visual: é um piso, e a cor é empurrada até alcançá-lo.
 * - `cores`: a escolha da pessoa para um papel, que vence o padrão.
 *
 * Nenhuma combinação pode produzir texto ilegível — quem garante isso é `parLegivel`, em `cor.ts`.
 */
export type AjustesVisuais = {
  intensidade: number;
  saturacao: number;
  brilho: number;
  contraste: number;
  cores: Partial<Record<PapelDeCor, string>>;
};

export const AJUSTES_PADRAO: AjustesVisuais = {
  intensidade: 100,
  saturacao: 100,
  brilho: 100,
  contraste: 4.5,
  cores: {},
};

export const LIMITES_VISUAIS = {
  intensidade: { min: 0, max: 100, passo: 5 },
  saturacao: { min: 0, max: 150, passo: 5 },
  brilho: { min: 70, max: 130, passo: 5 },
} as const;

/** Contrastes mínimos oferecidos: o do WCAG, o reforçado e o bem alto. */
export const CONTRASTES = [4.5, 7, 10] as const;

/** Sem padrão e sem ajuste nenhum, o site fica exatamente como era. */
export function ajusteEhNeutro(ajustes: AjustesVisuais): boolean {
  return (
    ajustes.saturacao === 100 &&
    ajustes.brilho === 100 &&
    ajustes.contraste === AJUSTES_PADRAO.contraste &&
    Object.keys(ajustes.cores).length === 0
  );
}

export function ehIdDePadrao(valor: unknown): valor is IdDoPadrao {
  return typeof valor === "string" && (IDS_DOS_PADROES as readonly string[]).includes(valor);
}

export function ehPapelDeCor(valor: unknown): valor is PapelDeCor {
  return typeof valor === "string" && (PAPEIS as readonly string[]).includes(valor);
}

/** O par de cores final de um papel: padrão, escolha da pessoa, ajustes e a trava de legibilidade. */
export function corDoPapel(
  papel: PapelDeCor,
  id: IdDoPadrao,
  temaEscuro: boolean,
  ajustes: AjustesVisuais = AJUSTES_PADRAO,
): ParDeCor {
  const tema = temaEscuro ? "escuro" : "claro";
  const base = CORES_DA_MARCA[tema][papel];
  const escolhida = ajustes.cores[papel];
  const doPadrao = id === "nenhum" ? undefined : PADROES_VISUAIS[id][tema][papel]?.fundo;

  // A escolha da pessoa vale inteira, sem diluir na intensidade: ela escolheu aquela cor.
  const alvo = escolhida ?? doPadrao ?? base;
  const fundo = escolhida ? alvo : misturar(base, alvo, ajustes.intensidade / 100);

  return parLegivel(fundo, {
    saturacao: ajustes.saturacao / 100,
    brilho: ajustes.brilho / 100,
    contrasteMinimo: ajustes.contraste,
  });
}

/**
 * As variáveis CSS do padrão escolhido, já no tema certo e com os ajustes aplicados.
 *
 * Devolve um objeto vazio quando não há nada a mudar — padrão "nenhum" e ajustes neutros —, e aí o
 * site fica com as cores da marca, sem nenhuma variável inline no caminho.
 */
export function variaveisDoPadrao(
  id: IdDoPadrao,
  temaEscuro: boolean,
  ajustes: AjustesVisuais = AJUSTES_PADRAO,
): Record<string, string> {
  const neutro = ajusteEhNeutro(ajustes);

  if (id === "nenhum" && neutro) return {};

  const tema = temaEscuro ? "escuro" : "claro";
  const variaveis: Record<string, string> = {};

  for (const papel of PAPEIS) {
    const doPadrao = id === "nenhum" ? undefined : PADROES_VISUAIS[id][tema][papel];
    const escolhida = ajustes.cores[papel];

    // Papel que o padrão não mexe e a pessoa não escolheu só muda se houver ajuste geral.
    if (!doPadrao && !escolhida && neutro) continue;

    const par = corDoPapel(papel, id, temaEscuro, ajustes);

    for (const nome of VARIAVEIS[papel].fundo) variaveis[nome] = par.fundo;
    for (const nome of VARIAVEIS[papel].texto) variaveis[nome] = par.texto;
  }

  return variaveis;
}

/** A paleta de um padrão num tema, para as amostras da tela de configurações. */
export function paletaDoPadrao(id: IdDoPadrao, temaEscuro: boolean): PaletaDoTema {
  if (id === "nenhum") {
    const tema = temaEscuro ? "escuro" : "claro";

    return Object.fromEntries(
      PAPEIS.map((papel) => [papel, parLegivel(CORES_DA_MARCA[tema][papel])]),
    ) as PaletaDoTema;
  }

  return temaEscuro ? PADROES_VISUAIS[id].escuro : PADROES_VISUAIS[id].claro;
}
