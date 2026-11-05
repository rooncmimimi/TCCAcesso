import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useSessao } from "@/hooks/useSessao";
import { ESTADO_INICIAL, interpretarTecla, type AcaoDoAtalho, type EstadoDosAtalhos } from "@/lib/atalhos";

export const EVENTO_ABRIR_ATALHOS = "acesso:abrir-atalhos";

/** Abre a lista de atalhos de qualquer lugar (menu de ajuda, comando de voz, tecla ?). */
export function abrirAjudaDeAtalhos() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_ATALHOS));
}

/** Há algum diálogo aberto agora? (Radix marca com `role="dialog"` e `data-state="open"`.) */
function dialogoAberto(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]') !== null;
}

/**
 * Liga os atalhos de teclado do ACESSO. A lógica de quando agir e quando não agir está em
 * `lib/atalhos.ts` (testada sem navegador); aqui só se ouve a tecla e se executa a ação.
 * Só cancela o evento quando uma ação de fato foi executada.
 */
export function useAtalhosDeTeclado() {
  const { preferencias } = useAcessibilidade();
  const { usuario, autenticado } = useSessao();
  const navigate = useNavigate();
  const estado = useRef<EstadoDosAtalhos>(ESTADO_INICIAL);

  const ativados = preferencias.shortcuts;
  const tipoDeUsuario = usuario?.tipo ?? null;

  useEffect(() => {
    if (!ativados) {
      estado.current = ESTADO_INICIAL;

      return undefined;
    }

    const executar = (acao: AcaoDoAtalho) => {
      if (acao.tipo === "navegar") {
        void navigate({ to: acao.para });
      } else if (acao.tipo === "ajuda") {
        abrirAjudaDeAtalhos();
      } else if (acao.tipo === "pesquisar") {
        document.querySelector<HTMLElement>("[data-busca-global]")?.click();
      }
    };

    const aoApertar = (evento: KeyboardEvent) => {
      const resultado = interpretarTecla(
        estado.current,
        { key: evento.key, ctrlKey: evento.ctrlKey, altKey: evento.altKey, metaKey: evento.metaKey, alvo: evento.target, repetida: evento.repeat },
        { ativados, autenticado, tipoDeUsuario, dialogoAberto: dialogoAberto() },
        performance.now(),
      );

      estado.current = resultado.estado;

      if (resultado.acao) {
        evento.preventDefault();
        executar(resultado.acao);
      }
    };

    document.addEventListener("keydown", aoApertar);

    return () => document.removeEventListener("keydown", aoApertar);
  }, [ativados, autenticado, tipoDeUsuario, navigate]);
}
