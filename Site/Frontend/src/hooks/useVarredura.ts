import { useCallback, useEffect, useRef, useState } from "react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { estaDigitando } from "@/lib/atalhos";
import { ESTADO_PARADO, atualizarItens, avancar, continuar, dentroDeGrupo, iniciar as iniciarMotor, itemAtual, parar as pararMotor, pausar as pausarMotor, sairDoGrupo, selecionar as selecionarMotor, voltar, type EstadoDaVarredura } from "@/lib/motorDeVarredura";
import { ehCampoDeTexto, montarItens, raizDaVarredura } from "@/lib/varredura";

const ESPERA_DA_PAGINA_MS = 200;

/**
 * Varredura com um botão. Liga o motor puro (`lib/motorDeVarredura.ts`) ao relógio, às teclas e à
 * página. Só funciona quando a pessoa ligou a varredura em Configurações, e só anda depois de
 * "Iniciar".
 *
 * Teclas, com a varredura iniciada:
 *  - **Espaço, Enter e a tecla extra escolhida** selecionam o item destacado (em um grupo, entram nele);
 *  - **Esc** sai do grupo, e fora de grupo para a varredura (ou, num campo de texto aberto pela varredura,
 *    sai do campo e volta a varrer);
 *  - **setas**, só com a varredura pausada, avançam e voltam item a item.
 * Nada disso vale enquanto a pessoa digita em um campo (os espaços e Enter são do texto).
 */
export function useVarredura() {
  const { preferencias } = useAcessibilidade();
  const { scanSpeed, scanKey, scanGroups, scanning, reduceMotion } = preferencias;

  const [estado, setEstadoReact] = useState<EstadoDaVarredura>(ESTADO_PARADO);
  const [aviso, setAviso] = useState("");
  const [emCampo, setEmCampo] = useState(false);
  const estadoRef = useRef(estado);
  const emCampoRef = useRef(false);
  const gruposRef = useRef(scanGroups);

  gruposRef.current = scanGroups;

  const definir = useCallback((novo: EstadoDaVarredura) => {
    estadoRef.current = novo;
    setEstadoReact(novo);
  }, []);

  const definirCampo = useCallback((valor: boolean) => {
    emCampoRef.current = valor;
    setEmCampo(valor);
  }, []);

  const reconstruir = useCallback(() => montarItens(raizDaVarredura(document), gruposRef.current), []);

  const iniciar = useCallback(() => {
    const itens = reconstruir();

    if (itens.length === 0) {
      setAviso("Não há controles para percorrer nesta tela.");

      return;
    }

    definirCampo(false);
    definir(iniciarMotor(itens));
    setAviso(`Varredura iniciada. ${itens.length === 1 ? "1 item" : `${itens.length} itens`}. Aperte Espaço ou Enter para selecionar, Esc para sair.`);
  }, [definir, definirCampo, reconstruir]);

  const pararTudo = useCallback(
    (mensagem = "Varredura parada.") => {
      definirCampo(false);
      definir(pararMotor());
      setAviso(mensagem);
    },
    [definir, definirCampo],
  );

  const pausar = useCallback(() => {
    definir(pausarMotor(estadoRef.current));
    setAviso(`Varredura pausada em: ${itemAtual(estadoRef.current)?.rotulo ?? "nenhum item"}.`);
  }, [definir]);

  const retomar = useCallback(() => {
    definirCampo(false);
    definir(continuar(estadoRef.current));
    setAviso("Varredura continuando.");
  }, [definir, definirCampo]);

  const anunciarSePausada = useCallback(() => {
    // Com a varredura andando sozinha, anunciar cada passo falaria sem parar: só se anuncia o passo manual.
    if (estadoRef.current.fase === "pausada") setAviso(itemAtual(estadoRef.current)?.rotulo ?? "");
  }, []);

  const proximo = useCallback(() => {
    definir(avancar(estadoRef.current));
    anunciarSePausada();
  }, [anunciarSePausada, definir]);

  const anterior = useCallback(() => {
    definir(voltar(estadoRef.current));
    anunciarSePausada();
  }, [anunciarSePausada, definir]);

  const sair = useCallback(() => {
    definir(sairDoGrupo(estadoRef.current));
    setAviso("Saiu do grupo.");
  }, [definir]);

  const selecionar = useCallback(() => {
    const { estado: novo, efeito } = selecionarMotor(estadoRef.current);

    definir(novo);

    if (efeito.tipo === "entrou-no-grupo") {
      setAviso(`Dentro de ${efeito.grupo.rotulo.replace(/^Grupo: /, "")}. Esc sai do grupo.`);

      return;
    }

    if (efeito.tipo !== "ativar") return;

    const alvo = efeito.item.elemento;

    if (ehCampoDeTexto(alvo)) {
      alvo.focus();
      definirCampo(true);
      definir(pausarMotor(novo));
      setAviso("Campo ativo. Digite ou dite o texto. Esc volta à varredura.");

      return;
    }

    setAviso(`${efeito.item.rotulo} acionado.`);
    alvo.click();
  }, [definir, definirCampo]);

  // Desligar a varredura nas preferências também a para.
  useEffect(() => {
    if (!scanning && estadoRef.current.fase !== "parada") {
      definirCampo(false);
      definir(pararMotor());
    }
  }, [scanning, definir, definirCampo]);

  // O relógio: anda sozinha só enquanto está "rodando" e a aba está visível.
  useEffect(() => {
    if (estado.fase !== "rodando") return undefined;

    const relogio = setInterval(() => {
      if (!document.hidden) definir(avancar(estadoRef.current));
    }, Math.max(300, scanSpeed * 1000));

    return () => clearInterval(relogio);
  }, [estado.fase, scanSpeed, definir]);

  // A página muda (diálogo abre, lista carrega, troca de rota): refaz a lista mantendo a posição.
  useEffect(() => {
    if (estado.fase === "parada") return undefined;

    let espera: ReturnType<typeof setTimeout> | null = null;

    const observador = new MutationObserver((mudancas) => {
      const relevante = mudancas.some((m) => {
        const alvo = m.target instanceof Element ? m.target : m.target.parentElement;

        return !alvo?.closest("[data-varredura-ignorar]");
      });

      if (!relevante) return;

      if (espera) clearTimeout(espera);

      espera = setTimeout(() => {
        const novo = atualizarItens(estadoRef.current, reconstruir());

        if (novo !== estadoRef.current) {
          if (novo.fase === "parada") {
            definirCampo(false);
            setAviso("Não há mais controles para percorrer. A varredura parou.");
          }

          definir(novo);
        }
      }, ESPERA_DA_PAGINA_MS);
    });

    observador.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-hidden", "hidden", "disabled", "inert", "data-state", "style", "class"] });

    return () => {
      observador.disconnect();
      if (espera) clearTimeout(espera);
    };
  }, [estado.fase, definir, definirCampo, reconstruir]);

  // Aba escondida: pausa, para não andar sem ninguém olhando.
  useEffect(() => {
    const aoMudarVisibilidade = () => {
      if (document.hidden && estadoRef.current.fase === "rodando") definir(pausarMotor(estadoRef.current));
    };

    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => document.removeEventListener("visibilitychange", aoMudarVisibilidade);
  }, [definir]);

  // As teclas. Na fase de captura, para ganhar de botões e diálogos; só cancela o que de fato consumiu.
  useEffect(() => {
    if (!scanning) return undefined;

    let consumiuEspaco = false;

    const ehTeclaDeSelecao = (tecla: string) => tecla === " " || tecla === "Enter" || (scanKey !== "" && tecla === scanKey);

    const aoApertar = (e: KeyboardEvent) => {
      if (estadoRef.current.fase === "parada" || e.ctrlKey || e.altKey || e.metaKey) return;

      const digitando = estaDigitando(e.target);

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (emCampoRef.current) {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          retomar();
        } else if (dentroDeGrupo(estadoRef.current)) {
          sair();
        } else {
          pararTudo();
        }

        return;
      }

      if (digitando) return;

      // Com o foco em um botão do próprio painel (quem usa Tab), Espaço e Enter acionam esse botão, não o item varrido.
      if (e.target instanceof Element && e.target.closest("[data-varredura-ignorar]")) return;

      if (ehTeclaDeSelecao(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === " ") consumiuEspaco = true;
        if (!e.repeat) selecionar();

        return;
      }

      if (estadoRef.current.fase === "pausada") {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          e.stopImmediatePropagation();
          proximo();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          e.stopImmediatePropagation();
          anterior();
        }
      }
    };

    // O Espaço em um botão aciona no keyup: sem cancelar também esse evento, o botão focado seria clicado de novo.
    const aoSoltar = (e: KeyboardEvent) => {
      if (e.key === " " && consumiuEspaco) {
        consumiuEspaco = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    document.addEventListener("keydown", aoApertar, true);
    document.addEventListener("keyup", aoSoltar, true);

    return () => {
      document.removeEventListener("keydown", aoApertar, true);
      document.removeEventListener("keyup", aoSoltar, true);
    };
  }, [scanning, scanKey, anterior, pararTudo, proximo, retomar, sair, selecionar]);

  return {
    estado,
    item: itemAtual(estado),
    aviso,
    emCampo,
    reduzirMovimento: reduceMotion,
    iniciar,
    pausar,
    retomar,
    proximo,
    anterior,
    sairDoGrupo: sair,
    selecionar,
    parar: () => pararTudo(),
  };
}
