import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChaveBase } from "@/i18n/dicionarios";
import { autorizouTraducaoOnline, guardarAutorizacaoDeTraducao } from "@/i18n/autorizacaoDeTraducao";
import { tradutorComReserva } from "@/i18n/tradutorComReserva";
import { ErroDeTraducao, type MotorDeTraducao } from "@/i18n/tradutorDoNavegador";
import type { CodigoIdioma } from "@/i18n/idiomas";
import { useIdioma } from "@/hooks/useIdioma";

export type EstadoDaTraducao = "original" | "preparando" | "traduzindo" | "traduzido" | "aviso";

export type Traducao<K extends string> = {
  estado: EstadoDaTraducao;
  /** O texto de um campo, já traduzido quando a tradução está ligada. */
  texto: (campo: K) => string;
  /** Alterna entre traduzir e ver o original. */
  alternar: () => void;
  /** O idioma de origem, se o detector soube. */
  origem: CodigoIdioma | null;
  destino: CodigoIdioma;
  /** Mensagem para mostrar (aviso ou erro), como chave do dicionário. */
  mensagem: ChaveBase | null;
  ocupado: boolean;
  /** Traduzir exige um serviço fora do aparelho e a pessoa ainda não autorizou: a tela pergunta. */
  precisaDeAutorizacao: boolean;
  /** A pessoa autorizou: guarda a resposta neste navegador e traduz agora. */
  autorizar: () => void;
  /** A pessoa preferiu não traduzir desta vez. Nada é guardado; dá para pedir de novo depois. */
  recusar: () => void;
  /** A tradução que está na tela veio de um serviço online, ou seja, o texto saiu do aparelho. */
  viaServicoOnline: boolean;
};

type NaMemoria = { textos: string[]; viaServicoOnline: boolean };

/** Em memória, enquanto a aba estiver aberta: voltar a traduzir o mesmo texto para o mesmo idioma não chama o motor de novo. */
const memoria = new Map<string, NaMemoria>();

/** Só para os testes: começa cada um sem tradução guardada. */
export function limparMemoriaDeTraducao() {
  memoria.clear();
}

/** Cada motivo de falha tem a sua explicação: "não deu" não diz à pessoa o que fazer a seguir. */
const MENSAGEM_DO_ERRO: Record<string, ChaveBase> = {
  nao_suportado: "traducao.naoSuportado",
  limite_diario: "traducao.limiteDiario",
  sem_rede: "traducao.semRede",
  texto_longo: "traducao.textoLongo",
};

/**
 * Traduz um conjunto de campos de texto (a publicação, o comentário, a vaga) para o idioma do site, a pedido da pessoa.
 *
 * Nada é traduzido sozinho: só no clique. O original nunca se perde (`alternar` volta a ele). O motor padrão usa o
 * tradutor embutido do navegador quando ele está pronto — aí o texto não sai do aparelho — e um serviço gratuito na
 * internet como reserva, que é o caso comum. Quando a reserva vai ser usada, a pessoa autoriza antes, uma vez.
 */
export function useTraducao<K extends string>(campos: Record<K, string>, motor: MotorDeTraducao = tradutorComReserva): Traducao<K> {
  const { idioma: destino } = useIdioma();
  const chaves = useMemo(() => Object.keys(campos) as K[], [campos]);
  const originais = useMemo(() => chaves.map((chave) => campos[chave] ?? ""), [campos, chaves]);
  const assinatura = `${destino}\u0000${originais.join("\u0000")}`;
  const [estado, setEstado] = useState<EstadoDaTraducao>("original");
  const [traduzidos, setTraduzidos] = useState<string[] | null>(null);
  const [origem, setOrigem] = useState<CodigoIdioma | null>(null);
  const [mensagem, setMensagem] = useState<ChaveBase | null>(null);
  const [precisaDeAutorizacao, setPrecisaDeAutorizacao] = useState(false);
  const [viaServicoOnline, setViaServicoOnline] = useState(false);
  const versaoRef = useRef(0);

  // O texto mudou (a publicação foi editada) ou o idioma do site mudou: a tradução antiga não vale.
  useEffect(() => {
    versaoRef.current += 1;
    setEstado("original");
    setTraduzidos(null);
    setOrigem(null);
    setMensagem(null);
    setPrecisaDeAutorizacao(false);
    setViaServicoOnline(false);
  }, [assinatura]);

  const traduzirAgora = useCallback(
    (jaAutorizou: boolean) => {
      if (!motor.disponivel()) {
        setEstado("aviso");
        setMensagem("traducao.naoSuportado");

        return;
      }

      const versao = ++versaoRef.current;
      const vigente = () => versaoRef.current === versao;

      setMensagem(null);
      setPrecisaDeAutorizacao(false);
      setEstado("traduzindo");

      void (async () => {
        try {
          const detectado = await motor.detectar(originais.join("\n").slice(0, 800));

          if (!vigente()) return;

          // Sem detector, supõe: o site é em português, então o que está em outro idioma costuma estar em inglês.
          const de: CodigoIdioma = detectado ?? (destino === "pt" ? "en" : "pt");

          setOrigem(detectado);

          if (de === destino) {
            setEstado("aviso");
            setMensagem("traducao.mesmoIdioma");

            return;
          }

          const chaveDaMemoria = `${de}>${assinatura}`;
          const emMemoria = memoria.get(chaveDaMemoria);

          if (emMemoria) {
            setTraduzidos(emMemoria.textos);
            setViaServicoOnline(emMemoria.viaServicoOnline);
            setEstado("traduzido");

            return;
          }

          const saiDoAparelho = (await motor.saiDoAparelho?.(de, destino)) ?? false;

          if (!vigente()) return;

          // O texto só sai do aparelho com a pessoa sabendo. Perguntado uma vez, lembrado depois.
          if (saiDoAparelho && !jaAutorizou && !autorizouTraducaoOnline()) {
            setEstado("aviso");
            setMensagem("traducao.pedeAutorizacao");
            setPrecisaDeAutorizacao(true);

            return;
          }

          const resultado = await motor.traduzir(originais, de, destino, () => vigente() && setEstado("preparando"));

          if (!vigente()) return;

          memoria.set(chaveDaMemoria, { textos: resultado, viaServicoOnline: saiDoAparelho });
          setTraduzidos(resultado);
          setViaServicoOnline(saiDoAparelho);
          setEstado("traduzido");
        } catch (erro) {
          if (!vigente()) return;

          setEstado("aviso");
          setMensagem((erro instanceof ErroDeTraducao && MENSAGEM_DO_ERRO[erro.codigo]) || "traducao.falhou");
        }
      })();
    },
    [motor, originais, destino, assinatura],
  );

  const alternar = useCallback(() => {
    if (estado === "traduzido") {
      setEstado("original");
      setMensagem(null);

      return;
    }

    if (estado === "preparando" || estado === "traduzindo") return;

    traduzirAgora(false);
  }, [estado, traduzirAgora]);

  const autorizar = useCallback(() => {
    guardarAutorizacaoDeTraducao();
    traduzirAgora(true);
  }, [traduzirAgora]);

  const recusar = useCallback(() => {
    setPrecisaDeAutorizacao(false);
    setEstado("original");
    setMensagem(null);
  }, []);

  const texto = useCallback(
    (campo: K) => {
      const indice = chaves.indexOf(campo);

      return estado === "traduzido" && traduzidos ? (traduzidos[indice] ?? campos[campo]) : (campos[campo] ?? "");
    },
    [chaves, estado, traduzidos, campos],
  );

  return {
    estado,
    texto,
    alternar,
    origem,
    destino,
    mensagem,
    ocupado: estado === "preparando" || estado === "traduzindo",
    precisaDeAutorizacao,
    autorizar,
    recusar,
    viaServicoOnline,
  };
}
