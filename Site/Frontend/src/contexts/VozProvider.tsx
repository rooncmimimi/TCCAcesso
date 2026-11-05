import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { toast } from "sonner";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { CHAVE_ESCOLHA_VOZ } from "@/contexts/AcessibilidadeContext";
import { type EscolhaVoz, type OpcoesFala, type VozContextValue, VozContext } from "@/contexts/VozContext";
import { localeDe } from "@/i18n/idiomas";
import { escolherVoz, idiomaDoSite, idiomaParaFalar } from "@/lib/idiomaDaFala";
import { mensagemSemVoz } from "@/lib/vocabularioDeLeitura";

/** Avisa uma vez por sessão e por idioma que o aparelho não tem voz dele (senão cada frase repetiria o aviso). */
function avisarSemVoz(idiomaDoTexto: ReturnType<typeof idiomaParaFalar>) {
  const chave = `acesso:voz:sem-voz:${idiomaDoTexto}`;

  try {
    if (window.sessionStorage.getItem(chave) === "1") return;
    window.sessionStorage.setItem(chave, "1");
  } catch {
    /* Sem sessionStorage, o aviso pode se repetir: melhor do que nunca avisar. */
  }

  toast(mensagemSemVoz(idiomaDoTexto, idiomaDoSite()));
}

type FalaAtual = {
  /** O texto inteiro da leitura, desde o começo. */
  original: string;
  opts: OpcoesFala | undefined;
  /** Posição, em `original`, onde esta fala começa (0, ou o ponto de uma retomada). */
  base: number;
  /** `charIndex` (nesta fala) do último `boundary` de palavra; -1 se a voz ainda não emitiu nenhum. */
  ultimo: number;
  pausada: boolean;
};

/**
 * Leitura por voz com a Web Speech API do navegador (`speechSynthesis`), em português e na
 * velocidade escolhida nas preferências. Também guarda a escolha do primeiro acesso (ver
 * `VozContext.ts`).
 */
export function VozProvider({ children }: { children: ReactNode }) {
  const { preferencias, salvar } = useAcessibilidade();
  const [suportado, setSuportado] = useState(false);
  const [falando, setFalando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [escolha, setChoiceState] = useState<EscolhaVoz>(null);
  const [perguntouNestaSessao, setAsked] = useState(false);
  const velocidadeRef = useRef(preferencias.speechRate);
  const preferenciasRef = useRef(preferencias);
  /** Quantas falas ainda estão na fila do navegador: `falando` só vira falso quando zera. */
  const naFilaRef = useRef(0);
  /**
   * Muda a cada `cancel()`. Uma fala cancelada ainda recebe o próprio `error` depois de a fala nova
   * já ter entrado na fila; sem comparar a geração, esse aviso tardio zeraria a conta da fila e
   * `falando` ficaria falso com a fala nova a caminho.
   */
  const geracaoRef = useRef(0);
  /** A fala sozinha em andamento, para a pausa por reinício (ver `pausar`). */
  const atualRef = useRef<FalaAtual | null>(null);
  /** Onde retomar depois de uma pausa por reinício. */
  const pendenteRef = useRef<{ original: string; opts: OpcoesFala | undefined; ponto: number } | null>(null);
  const iniciarFalaRef = useRef<(texto: string, opts: OpcoesFala | undefined, base: number, original: string) => void>(() => {});

  velocidadeRef.current = preferencias.speechRate;
  preferenciasRef.current = preferencias;

  useEffect(() => {
    setSuportado(typeof window !== "undefined" && "speechSynthesis" in window);
    try {
      const salvo = window.localStorage.getItem(CHAVE_ESCOLHA_VOZ) as EscolhaVoz;
      if (salvo === "accepted" || salvo === "declined") {
        setChoiceState(salvo);
        setAsked(true);
      }
    } catch {
      /* Sem acesso ao localStorage (modo privado ou bloqueado), a escolha só não é restaurada. */
    }
  }, []);

  const parar = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    geracaoRef.current += 1;
    naFilaRef.current = 0;
    atualRef.current = null;
    pendenteRef.current = null;
    setFalando(false);
    setPausado(false);
  }, []);

  /**
   * Pausa. O `pause()` nativo é irregular: no Chrome do Android ele equivale a cancelar, e algumas
   * vozes de rede travam ao retomar. Quando se sabe até onde a fala foi (houve `boundary`), a pausa
   * é feita por reinício: cancela e guarda o ponto, e `retomar` fala o que faltava a partir da
   * palavra em que parou. Sem esse ponto (ou com várias falas na fila), usa o `pause()` nativo.
   */
  const pausar = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!window.speechSynthesis.speaking) return;

    const atual = atualRef.current;
    if (atual && atual.ultimo >= 0 && naFilaRef.current === 1) {
      atual.pausada = true;
      pendenteRef.current = { original: atual.original, opts: atual.opts, ponto: atual.base + atual.ultimo };
      window.speechSynthesis.cancel();
      geracaoRef.current += 1;
      naFilaRef.current = 0;
      atualRef.current = null;
      setPausado(true);
      return;
    }

    window.speechSynthesis.pause();
    setPausado(true);
  }, []);

  const retomar = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pendente = pendenteRef.current;
    if (pendente) {
      pendenteRef.current = null;
      setPausado(false);
      iniciarFalaRef.current(pendente.original.slice(pendente.ponto), pendente.opts, pendente.ponto, pendente.original);
      return;
    }
    window.speechSynthesis.resume();
    setPausado(false);
  }, []);

  const iniciarFala = useCallback((textoLimpo: string, opts: OpcoesFala | undefined, base: number, original: string) => {
    if (opts?.interrupt !== false) {
      window.speechSynthesis.cancel();
      geracaoRef.current += 1;
      naFilaRef.current = 0;
      pendenteRef.current = null;
      setPausado(false);
    }

    const fala = new SpeechSynthesisUtterance(textoLimpo);
    // O idioma e a voz acompanham o TEXTO lido (uma tela ainda não traduzida segue em português mesmo com o
    // site em inglês); na dúvida, vale o idioma do site (`<html lang>`), e sem ele, português. Sem voz do
    // idioma no aparelho, o navegador usa a que tiver e a pessoa é avisada uma vez.
    const idioma = idiomaParaFalar(original, undefined, typeof document === "undefined" ? null : document.activeElement);
    fala.lang = localeDe(idioma);

    const vozes = window.speechSynthesis.getVoices?.() ?? [];
    const vozDoIdioma = escolherVoz(vozes, fala.lang);

    if (vozDoIdioma) fala.voice = vozDoIdioma;
    else if (vozes.length > 0) avisarSemVoz(idioma);
    fala.rate = velocidadeRef.current;
    naFilaRef.current += 1;
    const minhaGeracao = geracaoRef.current;

    const entrada: FalaAtual = { original, opts, base, ultimo: -1, pausada: false };
    // Só a fala sozinha pode ser pausada por reinício: com fila, o ponto de retomada seria ambíguo.
    atualRef.current = naFilaRef.current === 1 ? entrada : null;

    let encerrada = false;
    const encerrar = (motivo: "fim" | "erro" | "cancelada") => {
      // `end` e `error` podem chegar os dois para a mesma fala: conta uma vez só.
      if (encerrada) return;
      encerrada = true;
      // Cancelada só para pausar: a leitura segue "viva" e `retomar` a reinicia do ponto guardado.
      if (entrada.pausada) return;
      // Fala de uma geração anterior (cancelada) não mexe na fila da atual.
      if (minhaGeracao === geracaoRef.current) {
        naFilaRef.current = Math.max(0, naFilaRef.current - 1);
        if (naFilaRef.current === 0) {
          setFalando(false);
          setPausado(false);
        }
      }
      opts?.aoTerminar?.(motivo);
    };

    fala.onstart = () => {
      setFalando(true);
      // Depois de uma pausa por reinício, quem acompanha a leitura já foi avisado do começo.
      if (base === 0) opts?.aoIniciar?.();
    };
    fala.onboundary = (evento) => {
      if (evento.name === "word") entrada.ultimo = evento.charIndex;
      // O índice sempre aponta para o texto original, mesmo depois de uma retomada no meio dele.
      opts?.aoLimite?.({ charIndex: base + evento.charIndex, charLength: evento.charLength, name: evento.name });
    };
    fala.onend = () => encerrar("fim");
    fala.onerror = (evento) => {
      // `interrupted` e `canceled` são o nosso próprio `cancel()`, não uma falha.
      const cancelada = evento.error === "interrupted" || evento.error === "canceled";
      encerrar(cancelada ? "cancelada" : "erro");
    };
    window.speechSynthesis.speak(fala);
  }, []);
  iniciarFalaRef.current = iniciarFala;

  const falar = useCallback<VozContextValue["falar"]>(
    (text, opts) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const textoLimpo = text.trim();
      if (!textoLimpo) return;
      iniciarFala(textoLimpo, opts, 0, textoLimpo);
    },
    [iniciarFala],
  );

  const definirEscolha = useCallback<VozContextValue["definirEscolha"]>(
    (next) => {
      setChoiceState(next);
      setAsked(true);
      try {
        window.localStorage.setItem(CHAVE_ESCOLHA_VOZ, next);
      } catch {
        /* Sem acesso ao localStorage, a escolha vale só nesta sessão. */
      }
      // Grava na hora a decisão do primeiro acesso. `voiceConsent` registra a resposta em si (não
      // perguntar de novo), e `screenReader` é a preferência efetiva, que pode ser ligada e
      // desligada depois sem desfazer o consentimento. Os dois começam iguais porque é o mesmo
      // instante da decisão.
      salvar({ ...preferenciasRef.current, screenReader: next === "accepted", voiceConsent: next === "accepted" });
      if (next === "declined") parar();
    },
    [salvar, parar],
  );

  const limparEscolha = useCallback(() => {
    setChoiceState(null);
    setAsked(false);
    try {
      window.localStorage.removeItem(CHAVE_ESCOLHA_VOZ);
    } catch {
      /* Sem acesso ao localStorage, não há o que limpar. */
    }
  }, []);

  useEffect(() => parar, [parar]);

  const valorContexto = useMemo<VozContextValue>(
    () => ({
      suportado,
      falando,
      pausado,
      escolha,
      perguntouNestaSessao,
      falar,
      parar,
      pausar,
      retomar,
      definirEscolha,
      limparEscolha,
    }),
    [suportado, falando, pausado, escolha, perguntouNestaSessao, falar, parar, pausar, retomar, definirEscolha, limparEscolha],
  );

  return <VozContext.Provider value={valorContexto}>{children}</VozContext.Provider>;
}
