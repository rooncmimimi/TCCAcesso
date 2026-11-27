/**
 * O resultado do teste automático de voz, explicado em português comum: um nível (bom, atenção, problema ou
 * "não deu para saber"), uma frase de título, o que isso significa para quem usa e, à parte, os números para
 * quem acompanha o projeto. A página mostra primeiro o título e o significado; os números ficam escondidos.
 *
 * O que está dito aqui só vale para o que o aparelho FEZ naquele teste. Não prova nada sobre outras vozes.
 */

import type { ResultadoDePalavras, ResultadoDePausa } from "@/lib/diagnosticoDeVoz";
import { tx } from "@/i18n/frases";

export type Nivel = "bom" | "atencao" | "problema" | "inconclusivo";

export type Explicacao = {
  nivel: Nivel;
  titulo: string;
  /** O que isso significa para quem usa, sem termo técnico. */
  significado: string;
  /** Os números, para quem acompanha o projeto. */
  tecnico: string;
};

export const ROTULO_DO_NIVEL: Record<Nivel, string> = {
  get bom() { return tx("Bom"); },
  get atencao() { return tx("Atenção"); },
  get problema() { return tx("Problema"); },
  get inconclusivo() { return tx("Não deu para saber"); },
};

const PROPORCAO_BOA = 0.8;

export function explicarMarcacaoDasPalavras(r: ResultadoDePalavras | null): Explicacao | null {
  if (!r) return null;

  if (r.situacao === "sem-voz") {
    return { nivel: "inconclusivo", titulo: tx("Este navegador não tem leitura em voz alta"), significado: tx("Não há o que testar aqui. Experimente o Chrome, o Edge ou o Safari."), tecnico: "speechSynthesis ausente." };
  }

  if (r.situacao === "erro") {
    return { nivel: "inconclusivo", titulo: tx("A voz deu erro no teste"), significado: tx("Tente de novo ou escolha outra voz, em “Vozes instaladas”."), tecnico: tx`Erro: ${r.erro ?? "desconhecido"}.` };
  }

  const tecnico = tx`${r.palavrasInformadas} de ${r.totalDePalavras} palavras informadas${r.primeiroEventoMs !== null ? tx`; a primeira em ${r.primeiroEventoMs} ms` : tx("; nenhum aviso de palavra chegou")}; a fala ${r.terminou ? "terminou" : tx("não terminou no tempo do teste")}.`;

  if (r.palavrasInformadas >= Math.ceil(r.totalDePalavras * PROPORCAO_BOA)) {
    return { nivel: "bom", titulo: tx("A marcação das palavras é exata"), significado: tx("Esta voz avisa em que palavra está. Quando o ACESSO lê um texto, a palavra certa fica marcada."), tecnico };
  }

  if (r.palavrasInformadas > 0) {
    return { nivel: "atencao", titulo: tx("A voz avisa só parte das palavras"), significado: tx("A marcação pode pular algumas palavras. A frase continua marcada."), tecnico };
  }

  return {
    nivel: "atencao",
    titulo: tx("Esta voz não avisa em que palavra está"),
    significado: tx("O ACESSO marca a frase inteira e estima a palavra pelo tempo. Essa marcação é aproximada e pode adiantar ou atrasar uma ou duas palavras. Em muitos celulares e nas vozes “Google” do Chrome é assim mesmo."),
    tecnico,
  };
}

export function explicarPausaEContinuar(p: ResultadoDePausa | null, palavras: ResultadoDePalavras | null): Explicacao | null {
  if (!p) return null;

  if (p.situacao === "sem-voz") {
    return { nivel: "inconclusivo", titulo: tx("Este navegador não tem leitura em voz alta"), significado: tx("Não há o que testar aqui."), tecnico: "speechSynthesis ausente." };
  }

  if (p.situacao === "erro") {
    return { nivel: "inconclusivo", titulo: tx("O teste de pausa deu erro"), significado: tx("Tente de novo ou escolha outra voz, em “Vozes instaladas”."), tecnico: tx`Erro: ${p.erro ?? "desconhecido"}.` };
  }

  const tecnico = tx`Marcou como pausado: ${p.marcouPausado ? "sim" : tx("não")}; a pausa cortou a fala: ${p.pausaCancelouAFala ? "sim" : tx("não")}; voltou até o fim: ${p.retomouAteOFim ? "sim" : tx("não")}${p.estadoAoDesistir ? tx`; ao desistir, o navegador dizia falando=${p.estadoAoDesistir.falando ? "sim" : tx("não")} e pausado=${p.estadoAoDesistir.pausado ? "sim" : tx("não")}` : ""}.`;

  if (p.retomouAteOFim) {
    return { nivel: "bom", titulo: tx("Pausar e continuar funcionam"), significado: tx("Ao apertar Pausar a voz para, e ao apertar Continuar ela volta de onde parou."), tecnico };
  }

  const oQueAconteceu = p.pausaCancelouAFala ? tx("Neste aparelho, pausar corta a fala.") : tx("Neste aparelho, a voz parou, mas não voltou a falar ao continuar.");
  const voz = palavras && palavras.situacao === "executado" ? palavras.palavrasInformadas : null;

  if (voz !== null && voz > 0) {
    return { nivel: "atencao", titulo: tx("A pausa do navegador falha, mas o ACESSO contorna"), significado: tx`${oQueAconteceu} Como esta voz avisa as palavras, o ACESSO guarda onde parou e recomeça dali. Para conferir, use a Etapa 2.`, tecnico };
  }

  if (voz === null) {
    return { nivel: "atencao", titulo: tx("A pausa do navegador falha"), significado: tx`${oQueAconteceu} O ACESSO contorna isso quando a voz avisa as palavras. Rode também o teste da marcação das palavras e confira na Etapa 2.`, tecnico };
  }

  return { nivel: "problema", titulo: tx("Pausar e continuar podem não funcionar com esta voz"), significado: tx`${oQueAconteceu} Como esta voz também não avisa as palavras, o ACESSO não consegue recomeçar do ponto exato. Tente outra voz, em “Vozes instaladas”, e conte a quem acompanha o projeto.`, tecnico };
}

/** O pior nível entre os resultados que existem, para o resumo no alto dos resultados. */
export function piorNivel(explicacoes: Array<Explicacao | null>): Nivel | null {
  const niveis = explicacoes.filter((e): e is Explicacao => e !== null).map((e) => e.nivel);

  if (niveis.length === 0) return null;

  for (const n of ["problema", "inconclusivo", "atencao"] as const) if (niveis.includes(n)) return n;

  return "bom";
}

export const RESUMO_POR_NIVEL: Record<Nivel, string> = {
  get bom() { return tx("Tudo certo neste aparelho."); },
  get atencao() { return tx("Funciona, com limitações explicadas abaixo."); },
  get problema() { return tx("Há um problema com esta voz. Veja abaixo."); },
  get inconclusivo() { return tx("O teste não conseguiu terminar. Veja abaixo."); },
};
