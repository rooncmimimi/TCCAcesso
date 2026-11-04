import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChaveBase } from "@/i18n/dicionarios";
import { ErroDeTraducao, tradutorDoNavegador, type MotorDeTraducao } from "@/i18n/tradutorDoNavegador";
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
};

/** Em memória, enquanto a aba estiver aberta: voltar a traduzir o mesmo texto para o mesmo idioma não chama o motor de novo. */
const memoria = new Map<string, string[]>();

/** Só para os testes: começa cada um sem tradução guardada. */
export function limparMemoriaDeTraducao() {
  memoria.clear();
}

/**
 * Traduz um conjunto de campos de texto (a publicação, o comentário, a vaga) para o idioma do site, a pedido da pessoa.
 *
 * Nada é traduzido sozinho: só no clique. O original nunca se perde (`alternar` volta a ele). Os textos ficam no aparelho:
 * o motor padrão é o tradutor embutido do navegador. Sem ele, o estado vira `aviso` com a explicação, em vez de um botão mudo.
 */
export function useTraducao<K extends string>(campos: Record<K, string>, motor: MotorDeTraducao = tradutorDoNavegador): Traducao<K> {
  const { idioma: destino } = useIdioma();
  const chaves = useMemo(() => Object.keys(campos) as K[], [campos]);
  const originais = useMemo(() => chaves.map((chave) => campos[chave] ?? ""), [campos, chaves]);
  const assinatura = `${destino}\u0000${originais.join("\u0000")}`;
  const [estado, setEstado] = useState<EstadoDaTraducao>("original");
  const [traduzidos, setTraduzidos] = useState<string[] | null>(null);
  const [origem, setOrigem] = useState<CodigoIdioma | null>(null);
  const [mensagem, setMensagem] = useState<ChaveBase | null>(null);
  const versaoRef = useRef(0);

  // O texto mudou (a publicação foi editada) ou o idioma do site mudou: a tradução antiga não vale.
  useEffect(() => {
    versaoRef.current += 1;
    setEstado("original");
    setTraduzidos(null);
    setOrigem(null);
    setMensagem(null);
  }, [assinatura]);

  const alternar = useCallback(() => {
    if (estado === "traduzido") {
      setEstado("original");
      setMensagem(null);
      return;
    }

    if (estado === "preparando" || estado === "traduzindo") return;

    if (!motor.disponivel()) {
      setEstado("aviso");
      setMensagem("traducao.naoSuportado");
      return;
    }

    const versao = ++versaoRef.current;
    const vigente = () => versaoRef.current === versao;

    setMensagem(null);
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
        const resultado = emMemoria ?? (await motor.traduzir(originais, de, destino, () => vigente() && setEstado("preparando")));

        if (!vigente()) return;

        memoria.set(chaveDaMemoria, resultado);
        setTraduzidos(resultado);
        setEstado("traduzido");
      } catch (erro) {
        if (!vigente()) return;

        setEstado("aviso");
        setMensagem(erro instanceof ErroDeTraducao && erro.codigo === "nao_suportado" ? "traducao.naoSuportado" : "traducao.falhou");
      }
    })();
  }, [estado, motor, originais, destino, assinatura]);

  const texto = useCallback(
    (campo: K) => {
      const indice = chaves.indexOf(campo);

      return estado === "traduzido" && traduzidos ? (traduzidos[indice] ?? campos[campo]) : (campos[campo] ?? "");
    },
    [chaves, estado, traduzidos, campos],
  );

  return { estado, texto, alternar, origem, destino, mensagem, ocupado: estado === "preparando" || estado === "traduzindo" };
}
