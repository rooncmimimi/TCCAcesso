import { useCallback, useEffect, useRef, useState } from "react";

/** O mínimo da Web Speech API (`SpeechRecognition`) que o ditado usa. Não é padrão em todos os navegadores. */
interface ResultadoDeFala {
  isFinal: boolean;
  0: { transcript: string };
}

interface EventoDeResultado {
  resultIndex: number;
  results: ArrayLike<ResultadoDeFala>;
}

interface Reconhecimento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EventoDeResultado) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type ConstrutorDeReconhecimento = new () => Reconhecimento;

function construtor(): ConstrutorDeReconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorDeReconhecimento; webkitSpeechRecognition?: ConstrutorDeReconhecimento };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** O navegador oferece reconhecimento de fala? Firefox, por exemplo, não oferece. */
export function ditadoSuportado(): boolean {
  return construtor() !== null;
}

const MENSAGENS_DE_ERRO: Record<string, string> = {
  "not-allowed": "O navegador não deixou usar o microfone. Libere o microfone nas permissões do site e tente de novo.",
  "service-not-allowed": "O navegador não deixou usar o reconhecimento de voz neste site.",
  "audio-capture": "Não encontramos um microfone. Confira se ele está conectado.",
  "no-speech": "Não ouvimos nada. Tente falar mais perto do microfone.",
  network: "O reconhecimento de voz do navegador precisa de internet e não conseguiu se conectar.",
  "language-not-supported": "O navegador não reconhece este idioma por voz.",
};

/**
 * Ditado com a API de reconhecimento de fala do navegador.
 *
 * - **Só começa quando a pessoa pede** (`iniciar`), e o navegador pede a permissão do microfone.
 * - **Não guarda áudio**: o ACESSO só recebe o texto. Em vários navegadores (Chrome, Edge) o próprio
 *   navegador envia o áudio a um serviço online para reconhecer; isso depende do navegador e por
 *   isso a tela avisa. Não funciona sem internet nesses navegadores.
 * - O texto reconhecido NÃO vai direto para o campo: fica em `final` para a pessoa revisar.
 * - Para a escuta ao desmontar e quando a pessoa manda parar.
 */
export function useDitado() {
  const [suportado] = useState(ditadoSuportado);
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [final, setFinal] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const reconhecimentoRef = useRef<Reconhecimento | null>(null);

  const iniciar = useCallback(() => {
    const Construtor = construtor();
    if (!Construtor || reconhecimentoRef.current) return;

    const reconhecimento = new Construtor();
    reconhecimento.lang = (typeof document !== "undefined" && document.documentElement.lang) || "pt-BR";
    reconhecimento.continuous = true;
    reconhecimento.interimResults = true;

    reconhecimento.onresult = (evento) => {
      let provisorio = "";

      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        const texto = resultado[0].transcript;

        if (resultado.isFinal) {
          setFinal((atual) => `${atual}${atual && !atual.endsWith(" ") ? " " : ""}${texto.trim()}`);
        } else {
          provisorio += texto;
        }
      }

      setParcial(provisorio);
    };

    reconhecimento.onerror = (evento) => {
      setErro(MENSAGENS_DE_ERRO[evento.error] ?? "O ditado parou por um erro do navegador.");
    };

    reconhecimento.onend = () => {
      reconhecimentoRef.current = null;
      setOuvindo(false);
      setParcial("");
    };

    setErro(null);
    reconhecimentoRef.current = reconhecimento;

    try {
      reconhecimento.start();
      setOuvindo(true);
    } catch {
      reconhecimentoRef.current = null;
      setErro("Não foi possível ligar o microfone agora.");
    }
  }, []);

  /** Para na hora. O que já foi reconhecido continua em `final`. */
  const parar = useCallback(() => {
    reconhecimentoRef.current?.stop();
  }, []);

  const limpar = useCallback(() => {
    setFinal("");
    setParcial("");
    setErro(null);
  }, []);

  useEffect(
    () => () => {
      const atual = reconhecimentoRef.current;
      if (atual) {
        atual.onend = null;
        atual.abort();
        reconhecimentoRef.current = null;
      }
    },
    [],
  );

  return { suportado, ouvindo, parcial, final, erro, iniciar, parar, limpar };
}
