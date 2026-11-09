import { useCallback, useEffect, useRef, useState } from "react";

import {
  calarVozDoSite,
  construtor,
  FIM_DEFINITIVO,
  idiomaDeEscuta,
  MENSAGENS_DE_ERRO,
  NADA_FOI_OUVIDO,
  NAO_LIGOU,
  reconhecimentoDeFalaSuportado,
  soltarReconhecimento,
  type Reconhecimento,
} from "@/lib/microfone";

/** Quantas voltas sem ouvir nada antes de desistir (cada volta é um fim de turno do navegador). */
export const VOLTAS_EM_SILENCIO = 4;

/** Respiro entre o fim de um turno e o começo do próximo: o navegador precisa fechar a sessão anterior. */
export const ESPERA_PARA_RECOMECAR_MS = 400;

/**
 * Ditado com o reconhecimento de fala do navegador (ver `lib/microfone`).
 *
 * - **Só começa quando a pessoa pede** (`iniciar`), e o navegador pede a permissão do microfone.
 * - **Não guarda áudio**: o ACESSO só recebe o texto.
 * - O texto reconhecido NÃO vai direto para o campo: fica em `final` para a pessoa revisar.
 *
 * **Por que existe um recomeço automático.** O Chrome encerra a escuta sozinho depois de alguns segundos
 * de silêncio, mesmo com `continuous = true`, e às vezes termina sem resultado e sem erro nenhum. Quem
 * precisa de um tempo para organizar o que vai dizer — boa parte de quem usa o ACESSO — acabava falando
 * para um microfone já desligado, sem nenhum aviso: era o "o ditado não funciona". Enquanto a pessoa não
 * apertar "Parar", a escuta é reaberta sozinha; depois de `VOLTAS_EM_SILENCIO` voltas sem ouvir nada, o
 * ditado desiste e **explica**.
 */
export function useDitado() {
  const [suportado] = useState(reconhecimentoDeFalaSuportado);
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [final, setFinal] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const reconhecimentoRef = useRef<Reconhecimento | null>(null);
  /** A pessoa pediu para ditar e ainda não apertou "Parar". É o que autoriza o recomeço automático. */
  const querOuvirRef = useRef(false);
  /** Voltas seguidas em que o navegador encerrou o turno sem nada novo. */
  const silencioRef = useRef(0);
  /** Veio texto neste turno? Zera a cada turno novo. */
  const ouviuNoTurnoRef = useRef(false);
  /** Veio texto em algum momento desde que a pessoa começou a ditar. */
  const ouviuAlgoRef = useRef(false);
  const relogioRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abrirSessaoRef = useRef<() => void>(() => {});

  const cancelarRecomeco = () => {
    if (relogioRef.current) clearTimeout(relogioRef.current);
    relogioRef.current = null;
  };

  const soltarSessao = () => {
    const atual = reconhecimentoRef.current;

    reconhecimentoRef.current = null;
    soltarReconhecimento(atual);
  };

  const encerrar = useCallback((motivo?: string) => {
    querOuvirRef.current = false;
    cancelarRecomeco();
    setOuvindo(false);
    setParcial("");

    // Só avisa quando a escuta inteira não rendeu nada: com texto na mão, não houve falha a relatar.
    // E nunca por cima de um erro já explicado (microfone negado, por exemplo), que é mais específico.
    if (motivo && !ouviuAlgoRef.current) setErro((atual) => atual ?? motivo);
  }, []);

  const abrirSessao = useCallback(() => {
    const Construtor = construtor();

    if (!Construtor) return;

    // Uma sessão anterior ainda pendurada faria `start()` estourar: solta antes de abrir a nova.
    soltarSessao();

    const reconhecimento = new Construtor();

    reconhecimento.lang = idiomaDeEscuta();
    reconhecimento.continuous = true;
    reconhecimento.interimResults = true;
    ouviuNoTurnoRef.current = false;

    reconhecimento.onresult = (evento) => {
      let provisorio = "";

      for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        const texto = resultado[0].transcript;

        if (resultado.isFinal) {
          ouviuNoTurnoRef.current = true;
          ouviuAlgoRef.current = true;
          silencioRef.current = 0;
          setFinal((atual) => `${atual}${atual && !atual.endsWith(" ") ? " " : ""}${texto.trim()}`);
        } else {
          provisorio += texto;
        }
      }

      setParcial(provisorio);
    };

    reconhecimento.onerror = (evento) => {
      // `aborted` é o fim normal: acontece quando a pessoa aperta "Parar" ou sai da tela. Não é falha.
      if (evento.error === "aborted") return;

      // `no-speech` é só este turno sem fala; quem decide desistir é o `onend`, contando as voltas.
      if (evento.error === "no-speech") return;

      if (FIM_DEFINITIVO.has(evento.error)) {
        reconhecimentoRef.current = null;
        querOuvirRef.current = false;
        cancelarRecomeco();
        setOuvindo(false);
        setParcial("");
        setErro(MENSAGENS_DE_ERRO[evento.error]);

        return;
      }

      setErro(MENSAGENS_DE_ERRO[evento.error] ?? "O ditado parou por um erro do navegador.");
    };

    reconhecimento.onend = () => {
      reconhecimentoRef.current = null;
      setParcial("");

      if (!querOuvirRef.current) {
        encerrar(NADA_FOI_OUVIDO);

        return;
      }

      if (!ouviuNoTurnoRef.current) silencioRef.current += 1;

      if (silencioRef.current >= VOLTAS_EM_SILENCIO) {
        encerrar(MENSAGENS_DE_ERRO["no-speech"]);

        return;
      }

      // O navegador fechou o turno, mas a pessoa ainda quer ditar: reabre a escuta.
      cancelarRecomeco();
      relogioRef.current = setTimeout(() => {
        relogioRef.current = null;
        if (querOuvirRef.current) abrirSessaoRef.current();
      }, ESPERA_PARA_RECOMECAR_MS);
    };

    calarVozDoSite();
    reconhecimentoRef.current = reconhecimento;

    try {
      reconhecimento.start();
      setOuvindo(true);
    } catch {
      reconhecimentoRef.current = null;
      querOuvirRef.current = false;
      cancelarRecomeco();
      setOuvindo(false);
      setErro(NAO_LIGOU);
    }
  }, [encerrar]);

  // O recomeço automático acontece dentro do `onend` da sessão anterior, que não pode fechar sobre
  // `abrirSessao` sem criar um laço de dependência: daí a referência.
  useEffect(() => {
    abrirSessaoRef.current = abrirSessao;
  }, [abrirSessao]);

  const iniciar = useCallback(() => {
    if (!construtor()) return;

    querOuvirRef.current = true;
    silencioRef.current = 0;
    ouviuAlgoRef.current = false;
    setErro(null);
    abrirSessao();
  }, [abrirSessao]);

  /** Para na hora. O que já foi reconhecido continua em `final`. */
  const parar = useCallback(() => {
    querOuvirRef.current = false;
    cancelarRecomeco();

    const atual = reconhecimentoRef.current;

    if (!atual) {
      encerrar(NADA_FOI_OUVIDO);

      return;
    }

    try {
      atual.stop();
    } catch {
      // Sem conseguir parar pelo caminho normal, solta à força para não ficar preso em "ouvindo".
      soltarSessao();
      encerrar(NADA_FOI_OUVIDO);
    }
  }, [encerrar]);

  const limpar = useCallback(() => {
    setFinal("");
    setParcial("");
    setErro(null);
    ouviuAlgoRef.current = false;
  }, []);

  // Ao sair da tela, a escuta não fica ligada atrás.
  useEffect(
    () => () => {
      querOuvirRef.current = false;
      cancelarRecomeco();
      soltarSessao();
    },
    [],
  );

  return { suportado, ouvindo, parcial, final, erro, iniciar, parar, limpar };
}
