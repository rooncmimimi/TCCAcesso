/**
 * Diagnóstico da voz do aparelho: mede, de verdade, o que o navegador faz com a síntese de fala. Serve
 * para a pessoa rodar em um celular ou computador real e copiar um relatório (o que eu não consigo
 * fazer daqui). Mede três coisas: (1) a voz informa cada palavra (`boundary`)? (2) `pause()` pausa de
 * verdade ou cancela a fala (como no Chrome do Android)? (3) quais vozes existem e quais são locais.
 *
 * O sintetizador entra por parâmetro (`SintetizadorDeFala`) para testar sem navegador. As medições são
 * do que o aparelho FEZ naquele momento: não provam nada sobre outras vozes, outros aparelhos nem sobre
 * como uma pessoa percebe o resultado (o relatório tem espaço para a resposta dela).
 */

export type VozDoAparelho = { name: string; lang: string; localService: boolean; default: boolean };

export type EnunciadoDeFala = {
  voice: unknown;
  lang: string;
  rate: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onboundary: ((e: { name?: string; charIndex: number }) => void) | null;
};

export type SintetizadorDeFala = {
  speak: (u: EnunciadoDeFala) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  readonly speaking: boolean;
  readonly paused: boolean;
  getVoices: () => VozDoAparelho[];
};

export type CriarEnunciado = (texto: string, voz: VozDoAparelho | null) => EnunciadoDeFala;

export const TEXTO_DO_TESTE_DE_PALAVRAS = "Este é um teste curto da voz do ACESSO, para saber se cada palavra é informada.";
export const TEXTO_DO_TESTE_DE_PAUSA = "Este é um teste de pausa. A fala vai parar por um instante e depois continuar até o fim, se o aparelho permitir.";

export function contarPalavras(texto: string): number {
  return (texto.match(/\S+/g) ?? []).length;
}

/** Resumo das vozes: quantas são do português, quantas locais e quantas de rede. */
export function resumirVozes(vozes: VozDoAparelho[]) {
  const portugues = vozes.filter((v) => /^pt(\b|[-_])/i.test(v.lang));

  return {
    total: vozes.length,
    portugues: portugues.length,
    locaisEmPortugues: portugues.filter((v) => v.localService).length,
    deRedeEmPortugues: portugues.filter((v) => !v.localService).length,
    padrao: vozes.find((v) => v.default)?.name ?? null,
  };
}

export type ResultadoDePalavras = {
  /** `executado`: o teste rodou até o fim. `sem-voz`: o navegador não tem síntese de fala. */
  situacao: "executado" | "sem-voz" | "erro";
  totalDePalavras: number;
  palavrasInformadas: number;
  eventosDeFrase: number;
  primeiroEventoMs: number | null;
  terminou: boolean;
  erro?: string;
};

type Relogio = { agora: () => number; esperar: (ms: number) => Promise<void> };

const RELOGIO_REAL: Relogio = { agora: () => Date.now(), esperar: (ms) => new Promise((r) => setTimeout(r, ms)) };

/**
 * Fala `texto` e conta os eventos `boundary`. Termina quando a fala acaba, dá erro ou passa de
 * `limiteMs`. Eventos repetidos para a mesma posição contam uma vez.
 */
export async function testarEventosDePalavra(sintetizador: SintetizadorDeFala | null, criar: CriarEnunciado, voz: VozDoAparelho | null, texto = TEXTO_DO_TESTE_DE_PALAVRAS, limiteMs = 15_000, relogio: Relogio = RELOGIO_REAL): Promise<ResultadoDePalavras> {
  const total = contarPalavras(texto);

  if (!sintetizador) return { situacao: "sem-voz", totalDePalavras: total, palavrasInformadas: 0, eventosDeFrase: 0, primeiroEventoMs: null, terminou: false };

  return new Promise((resolver) => {
    const posicoes = new Set<number>();
    let frases = 0;
    let primeiro: number | null = null;
    let inicio = 0;
    let fechado = false;

    const fechar = (extra: Partial<ResultadoDePalavras>) => {
      if (fechado) return;
      fechado = true;
      resolver({ situacao: "executado", totalDePalavras: total, palavrasInformadas: posicoes.size, eventosDeFrase: frases, primeiroEventoMs: primeiro, terminou: false, ...extra });
    };

    const u = criar(texto, voz);

    u.onstart = () => {
      inicio = relogio.agora();
    };
    u.onboundary = (e) => {
      if (e.name === "word") {
        posicoes.add(e.charIndex);
        if (primeiro === null) primeiro = relogio.agora() - inicio;
      } else if (e.name === "sentence") {
        frases += 1;
      }
    };
    u.onend = () => fechar({ terminou: true });
    u.onerror = (e) => fechar({ situacao: "erro", erro: e.error ?? "erro desconhecido" });

    sintetizador.cancel();
    sintetizador.speak(u);

    void relogio.esperar(limiteMs).then(() => {
      sintetizador.cancel();
      fechar({ terminou: false });
    });
  });
}

export type ResultadoDePausa = {
  situacao: "executado" | "sem-voz" | "erro";
  /** `speechSynthesis.paused` ficou verdadeiro depois de `pause()`. */
  marcouPausado: boolean;
  /** A fala acabou (ou deu erro) logo depois de `pause()`: o `pause()` do aparelho CANCELA em vez de pausar. */
  pausaCancelouAFala: boolean;
  /** Depois de `resume()`, a fala foi até o fim. */
  retomouAteOFim: boolean;
  /**
   * Se a fala NÃO terminou depois de retomar: o que o navegador dizia na hora de desistir. `falando`
   * verdadeiro com a fala parada sugere que a voz travou; `falando` falso, que ela acabou sem avisar (sem o evento de fim).
   */
  estadoAoDesistir?: { falando: boolean; pausado: boolean } | null;
  erro?: string;
};

/**
 * Fala, pausa com o `pause()` nativo, espera, retoma e vê se a fala chega ao fim. É o comportamento do
 * aparelho SEM a pausa por reinício do ACESSO: serve para saber se ela é necessária neste aparelho.
 */
export async function testarPausaNativa(sintetizador: SintetizadorDeFala | null, criar: CriarEnunciado, voz: VozDoAparelho | null, texto = TEXTO_DO_TESTE_DE_PAUSA, relogio: Relogio = RELOGIO_REAL): Promise<ResultadoDePausa> {
  const vazio: ResultadoDePausa = { situacao: "executado", marcouPausado: false, pausaCancelouAFala: false, retomouAteOFim: false };

  if (!sintetizador) return { ...vazio, situacao: "sem-voz" };

  let terminou = false;
  let erro: string | undefined;
  // O cancelamento que o PRÓPRIO teste faz no fim gera um erro `interrupted`: ele não é um resultado.
  let cancelamosNos = false;
  const u = criar(texto, voz);

  u.onend = () => {
    terminou = true;
  };
  u.onerror = (e) => {
    if (cancelamosNos) return;
    terminou = true;
    erro = e.error;
  };

  sintetizador.cancel();
  sintetizador.speak(u);

  await relogio.esperar(1500); // deixa a voz começar a falar

  if (terminou) return { ...vazio, situacao: "erro", erro: erro ?? "A fala acabou antes de o teste pausar." };

  sintetizador.pause();
  await relogio.esperar(600);

  const marcouPausado = sintetizador.paused;
  const pausaCancelouAFala = terminou;

  if (!pausaCancelouAFala) {
    await relogio.esperar(1500);
    sintetizador.resume();
    // Margem generosa: a fala inteira costuma levar menos de 10 s.
    for (let i = 0; i < 100 && !terminou; i += 1) await relogio.esperar(200);
  }

  let estadoAoDesistir: ResultadoDePausa["estadoAoDesistir"] = null;

  if (!terminou) {
    estadoAoDesistir = { falando: sintetizador.speaking, pausado: sintetizador.paused };
    cancelamosNos = true;
    sintetizador.cancel();
  }

  return { situacao: erro && !pausaCancelouAFala ? "erro" : "executado", marcouPausado, pausaCancelouAFala, retomouAteOFim: !pausaCancelouAFala && terminou && !erro, estadoAoDesistir, erro };
}

export type DadosDoRelatorio = {
  navegador: string;
  plataforma: string;
  idioma: string;
  online: boolean;
  suporte: { sintese: boolean; destaquePorPalavra: boolean; reconhecimentoDeFala: boolean };
  vozes: ReturnType<typeof resumirVozes>;
  vozEscolhida: VozDoAparelho | null;
  palavras: ResultadoDePalavras | null;
  pausa: ResultadoDePausa | null;
  /** O que a pessoa observou na leitura de verdade do ACESSO (marcado por ela). */
  observacoes: { destaque: string; pausa: string; continuar: string; comentario: string };
  quando: string;
};

const sim = (v: boolean) => (v ? "sim" : "não");

/** O texto do relatório, para copiar e colar. Só tem o que o aparelho informa e o que a pessoa marcou. */
export function montarRelatorio(d: DadosDoRelatorio): string {
  const linhas = [
    "Relatório de voz do ACESSO",
    `Data: ${d.quando}`,
    `Navegador: ${d.navegador}`,
    `Sistema: ${d.plataforma} | idioma ${d.idioma} | ${d.online ? "com internet" : "sem internet"}`,
    "",
    "Suporte:",
    `- Síntese de fala: ${sim(d.suporte.sintese)}`,
    `- Destaque por palavra (CSS Custom Highlight API): ${sim(d.suporte.destaquePorPalavra)}`,
    `- Reconhecimento de fala (ditado e comandos): ${sim(d.suporte.reconhecimentoDeFala)}`,
    "",
    `Vozes: ${d.vozes.total} no total; ${d.vozes.portugues} em português (${d.vozes.locaisEmPortugues} locais, ${d.vozes.deRedeEmPortugues} de rede). Padrão do aparelho: ${d.vozes.padrao ?? "não informada"}.`,
    `Voz testada: ${d.vozEscolhida ? `${d.vozEscolhida.name} (${d.vozEscolhida.lang}, ${d.vozEscolhida.localService ? "local" : "de rede"})` : "a padrão do navegador"}.`,
    "",
  ];

  if (d.palavras) {
    const p = d.palavras;

    linhas.push(
      "Teste de palavra por palavra:",
      p.situacao === "sem-voz"
        ? "- Não executado: o navegador não tem síntese de fala."
        : `- ${p.palavrasInformadas} de ${p.totalDePalavras} palavras informadas${p.primeiroEventoMs !== null ? `; primeiro evento em ${p.primeiroEventoMs} ms` : "; nenhum evento de palavra chegou"}; a fala ${p.terminou ? "terminou" : "não terminou no tempo do teste"}${p.erro ? `; erro: ${p.erro}` : ""}.`,
      `- Veredito: ${p.situacao !== "executado" ? "inconclusivo" : p.palavrasInformadas >= Math.ceil(p.totalDePalavras * 0.8) ? "esta voz informa as palavras (destaque exato)" : p.palavrasInformadas > 0 ? "esta voz informa só parte das palavras" : "esta voz NÃO informa as palavras (o ACESSO usa o destaque aproximado)"}.`,
      "",
    );
  }

  if (d.pausa) {
    const p = d.pausa;

    linhas.push(
      "Teste de pausa nativa (pause/resume do navegador, sem a pausa por reinício do ACESSO):",
      p.situacao === "sem-voz"
        ? "- Não executado: o navegador não tem síntese de fala."
        : `- Marcou como pausado: ${sim(p.marcouPausado)}; pause() cancelou a fala: ${sim(p.pausaCancelouAFala)}; retomou até o fim: ${sim(p.retomouAteOFim)}${p.estadoAoDesistir ? `; ao desistir, o navegador dizia falando=${sim(p.estadoAoDesistir.falando)} e pausado=${sim(p.estadoAoDesistir.pausado)}` : ""}${p.erro ? `; erro: ${p.erro}` : ""}.`,
      `- Veredito: ${p.situacao !== "executado" ? "inconclusivo" : p.pausaCancelouAFala ? "pause() CANCELA a fala neste aparelho (a pausa por reinício do ACESSO é necessária)" : p.retomouAteOFim ? "pause() e resume() funcionam" : "pause() funcionou, mas a fala NÃO voltou ao retomar (trava ao continuar)"}.`,
      "",
    );
  }

  linhas.push(
    "Na leitura de verdade do ACESSO (marcado por quem testou):",
    `- Destaque: ${d.observacoes.destaque || "não informado"}`,
    `- Pausar: ${d.observacoes.pausa || "não informado"}`,
    `- Continuar: ${d.observacoes.continuar || "não informado"}`,
    `- Comentário: ${d.observacoes.comentario.trim() || "(nenhum)"}`,
  );

  return linhas.join("\n");
}
