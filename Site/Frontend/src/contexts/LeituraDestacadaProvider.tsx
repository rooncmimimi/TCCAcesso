import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useVoz } from "@/hooks/useVoz";
import {
  type LeituraDestacadaContextValue,
  type ModoDestaque,
  LeituraDestacadaContext,
} from "@/contexts/LeituraDestacadaContext";
import { criarCronograma, criarRelogio, gravarRitmo, lerRitmo, novaCalibracao, palavraNoInstante, type Cronograma, type RelogioDeFala } from "@/lib/leituraEstimada";
import {
  aplicarDestaque,
  criarRange,
  DESTAQUE_FRASE,
  DESTAQUE_PALAVRA,
  dividirEmFrases,
  intervaloDaPalavra,
  limparDestaques,
  montarMapa,
  suporteDestaque,
  type MapaDeTexto,
} from "@/lib/leituraDestacada";

/** Quanto esperar por um evento de palavra antes de concluir que esta voz não emite. */
export const ESPERA_DO_PRIMEIRO_LIMITE_MS = 1500;

/** De quanto em quanto tempo a palavra estimada é conferida. */
export const INTERVALO_DA_ESTIMATIVA_MS = 60;

const CHAVE_SO_FRASES = "acesso:voz:so-frases";

/**
 * Lembra, na sessão do navegador, que a voz atual não emite `boundary` de palavra. Na próxima
 * leitura já começa por frase, sem repetir o atraso de descobrir de novo.
 */
function lerSoFrases(): boolean {
  try {
    return window.sessionStorage.getItem(CHAVE_SO_FRASES) === "1";
  } catch {
    return false;
  }
}

function gravarSoFrases(): void {
  try {
    window.sessionStorage.setItem(CHAVE_SO_FRASES, "1");
  } catch {
    /* Sem sessionStorage, só se descobre de novo na próxima leitura. */
  }
}

/**
 * Leitura de um bloco de texto com destaque acompanhando a voz.
 *
 * **Palavra por palavra.** Fala o texto inteiro numa fala só e, a cada evento `boundary` do tipo
 * `word`, destaca a palavra que o `charIndex` aponta. O evento depende do navegador e da voz: vozes
 * de rede, por exemplo, costumam não emiti-lo. Por isso há três defesas contra destacar a palavra
 * errada:
 * 1. só vale `boundary` com `name === "word"`; frases e eventos sem nome são ignorados;
 * 2. um `charIndex` que não avança (igual ou menor que o último) é descartado;
 * 3. se nenhum evento de palavra chegar em `ESPERA_DO_PRIMEIRO_LIMITE_MS` depois do início da fala,
 *    a voz é tratada como "sem palavra": a leitura recomeça por **frases**, uma fala por frase, e
 *    a frase atual é destacada quando cada fala começa (não depende de `boundary`).
 *
 * **Sem a CSS Custom Highlight API** (ou com o destaque por palavra desligado), só o bloco é marcado.
 *
 * Só uma leitura destacada existe por vez; começar outra encerra a anterior.
 */
export function LeituraDestacadaProvider({ children }: { children: ReactNode }) {
  const { preferencias } = useAcessibilidade();
  const { falar, parar: pararVoz, pausar, retomar, pausado } = useVoz();
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;
  const [lendo, setLendo] = useState(false);
  const [modo, setModo] = useState<ModoDestaque | null>(null);

  const idRef = useRef(0);
  const blocoMarcadoRef = useRef<HTMLElement | null>(null);
  const vigiaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destaquePorPalavraRef = useRef(preferencias.wordHighlight);
  destaquePorPalavraRef.current = preferencias.wordHighlight;
  const estimarRef = useRef(preferencias.estimatedHighlight);
  estimarRef.current = preferencias.estimatedHighlight;
  const velocidadeRef = useRef(preferencias.speechRate);
  velocidadeRef.current = preferencias.speechRate;

  /** A frase em andamento no modo aproximado: cronograma estimado, relógio e o relógio de conferência. */
  const estimativaRef = useRef<{ cronograma: Cronograma; relogio: RelogioDeFala; tique: ReturnType<typeof setInterval> } | null>(null);

  const pararEstimativa = useCallback((medir: boolean) => {
    const atual = estimativaRef.current;

    if (!atual) return;

    clearInterval(atual.tique);
    estimativaRef.current = null;

    // Só uma frase que foi até o fim ensina o ritmo da voz.
    if (medir) {
      const novo = novaCalibracao(lerRitmo(), atual.cronograma.pesoTotal, atual.relogio.decorridoMs(), velocidadeRef.current);

      if (novo !== null) gravarRitmo(novo);
    }
  }, []);

  // A pausa da leitura congela o relógio da estimativa (e o retomar o solta).
  useEffect(() => {
    if (pausado) estimativaRef.current?.relogio.pausar();
    else estimativaRef.current?.relogio.retomar();
  }, [pausado]);

  const limparMarcas = useCallback(() => {
    pararEstimativa(false);
    limparDestaques();
    blocoMarcadoRef.current?.removeAttribute("data-speaking");
    blocoMarcadoRef.current = null;
    if (vigiaRef.current) {
      clearTimeout(vigiaRef.current);
      vigiaRef.current = null;
    }
  }, [pararEstimativa]);

  const concluir = useCallback(
    (id: number) => {
      if (idRef.current !== id) return;
      limparMarcas();
      setLendo(false);
      setModo(null);
    },
    [limparMarcas],
  );

  const parar = useCallback(() => {
    idRef.current += 1;
    limparMarcas();
    setLendo(false);
    setModo(null);
    pararVoz();
  }, [limparMarcas, pararVoz]);

  const lerPorFrases = useCallback(
    (id: number, mapa: MapaDeTexto, prefixo: string) => {
      const frases = dividirEmFrases(mapa.texto);
      const estimar = estimarRef.current;

      setModo(estimar ? "estimado" : "frase");

      frases.forEach(([inicio, fim], indice) => {
        const ultima = indice === frases.length - 1;
        const prefixoDaFrase = indice === 0 ? prefixo : "";

        falar(`${prefixoDaFrase}${mapa.texto.slice(inicio, fim)}`, {
          // Só a primeira corta o que estava sendo dito; as demais entram na fila.
          interrupt: indice === 0,
          aoIniciar: () => {
            if (idRef.current !== id) return;
            aplicarDestaque(DESTAQUE_FRASE, criarRange(mapa, inicio, fim));

            if (!estimar) return;

            // Palavra APROXIMADA: o tempo da frase repartido entre as palavras, no ritmo medido nesta sessão.
            pararEstimativa(false);

            const cronograma = criarCronograma(`${prefixoDaFrase}${mapa.texto.slice(inicio, fim)}`, lerRitmo(), velocidadeRef.current);
            const relogio = criarRelogio();

            if (pausadoRef.current) relogio.pausar();

            let anterior: number | null = null;

            const conferir = () => {
              const palavraAtual = palavraNoInstante(cronograma, relogio.decorridoMs());

              if (!palavraAtual || palavraAtual.inicio < prefixoDaFrase.length) {
                if (anterior !== -1) aplicarDestaque(DESTAQUE_PALAVRA, null);
                anterior = -1;

                return;
              }

              if (anterior === palavraAtual.inicio) return;

              anterior = palavraAtual.inicio;
              const deslocamento = inicio - prefixoDaFrase.length;

              aplicarDestaque(DESTAQUE_PALAVRA, criarRange(mapa, palavraAtual.inicio + deslocamento, palavraAtual.fim + deslocamento));
            };

            estimativaRef.current = { cronograma, relogio, tique: setInterval(conferir, INTERVALO_DA_ESTIMATIVA_MS) };
            conferir();
          },
          aoTerminar: (motivo) => {
            if (idRef.current !== id) return;
            pararEstimativa(motivo === "fim");
            if (motivo !== "fim" || ultima) concluir(id);
          },
        });
      });
    },
    [falar, concluir, pararEstimativa],
  );

  const ler = useCallback<LeituraDestacadaContextValue["ler"]>(
    (alvo, opcoes) => {
      const id = ++idRef.current;
      limparMarcas();

      const mapa = montarMapa(alvo);
      if (!mapa.texto) {
        setLendo(false);
        setModo(null);
        return;
      }

      const prefixo = opcoes?.prefixo ?? "";
      const falado = `${prefixo}${mapa.texto}`;
      setLendo(true);

      const destacarPorPalavra = destaquePorPalavraRef.current && suporteDestaque();

      if (!destacarPorPalavra) {
        // Plano C: marca o bloco e lê, sem acompanhar a fala.
        alvo.setAttribute("data-speaking", "true");
        blocoMarcadoRef.current = alvo;
        setModo("bloco");
        falar(falado, { aoTerminar: () => concluir(id) });
        return;
      }

      if (lerSoFrases()) {
        lerPorFrases(id, mapa, prefixo);
        return;
      }

      setModo("palavra");
      let ultimoIndice = -1;
      let viuPalavra = false;
      let recomecandoPorFrases = false;

      falar(falado, {
        aoIniciar: () => {
          if (idRef.current !== id) return;
          vigiaRef.current = setTimeout(() => {
            if (idRef.current !== id || viuPalavra) return;
            // Esta voz não emite `boundary` de palavra: recomeça por frases e lembra disso.
            gravarSoFrases();
            recomecandoPorFrases = true;
            lerPorFrases(id, mapa, prefixo);
          }, ESPERA_DO_PRIMEIRO_LIMITE_MS);
        },
        aoLimite: (limite) => {
          if (idRef.current !== id || recomecandoPorFrases) return;
          if (limite.name !== "word") return;
          if (limite.charIndex <= ultimoIndice) return;
          ultimoIndice = limite.charIndex;
          viuPalavra = true;

          // Ainda no prefixo ("Título de nível 1:"): prova que a voz emite palavras, mas não há o
          // que destacar no texto.
          const posicao = limite.charIndex - prefixo.length;
          if (posicao < 0) return;

          const intervalo = intervaloDaPalavra(mapa.texto, posicao);
          aplicarDestaque(DESTAQUE_PALAVRA, intervalo ? criarRange(mapa, intervalo[0], intervalo[1]) : null);
        },
        aoTerminar: (motivo) => {
          // O recomeço por frases cancela esta fala de propósito: quem conclui é a nova.
          if (recomecandoPorFrases) return;
          if (idRef.current !== id) return;
          if (motivo === "cancelada") return;
          concluir(id);
        },
      });
    },
    [falar, concluir, limparMarcas, lerPorFrases],
  );

  // Ao sair da página (ou desmontar), a leitura e as marcas não ficam para trás.
  useEffect(
    () => () => {
      idRef.current += 1;
      limparMarcas();
    },
    [limparMarcas],
  );

  const valor = useMemo<LeituraDestacadaContextValue>(
    () => ({ lendo, pausado, modo, ler, pausar, retomar, parar }),
    [lendo, pausado, modo, ler, pausar, retomar, parar],
  );

  return <LeituraDestacadaContext.Provider value={valor}>{children}</LeituraDestacadaContext.Provider>;
}
