import { useEffect } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

const CONTAINER_ID = "vlibras-container";
const SCRIPT_ID = "vlibras-plugin-script";
const PLUGIN_URL = "https://vlibras.gov.br/app";

/**
 * Widget oficial VLibras (Governo Federal).
 *
 * Detalhes importantes da integração em SPA:
 * - o plugin oficial só monta a interface dentro de `window.onload`; como o
 *   script é injetado depois que a página já carregou, disparamos um evento
 *   `load` manualmente após a construção do Widget;
 * - componentes Radix (diálogos/menus) aplicam `aria-hidden` nos filhos diretos
 *   do body, o que escondia o botão do VLibras — um observer remove esse
 *   atributo do container.
 */
export function VLibras() {
  const { prefs, hydrated } = useAccessibility();

  useEffect(() => {
    if (!hydrated || !prefs.vlibras) return;
    if (document.getElementById(CONTAINER_ID)) return;

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.setAttribute("vw", "");
    container.className = "enabled";
    container.innerHTML =
      '<div vw-access-button class="active"></div>' +
      '<div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(container);

    /* Mantém o widget acessível mesmo com diálogos Radix abertos. */
    const limparAriaHidden = () => {
      if (container.hasAttribute("aria-hidden")) container.removeAttribute("aria-hidden");
      if (container.hasAttribute("data-aria-hidden")) container.removeAttribute("data-aria-hidden");
      /* Radix aplica pointer-events:none nos irmãos ao abrir um diálogo. */
      if (container.style.pointerEvents !== "auto") container.style.pointerEvents = "auto";
    };
    const observer = new MutationObserver(limparAriaHidden);
    observer.observe(container, { attributes: true, attributeFilter: ["aria-hidden", "data-aria-hidden", "style"] });
    limparAriaHidden();

    const iniciarWidget = () => {
      try {
        new window.VLibras!.Widget(PLUGIN_URL);
        /* O plugin monta a UI dentro de window.onload; em SPA já passou. */
        if (document.readyState === "complete") {
          window.dispatchEvent(new Event("load"));
        }
      } catch {
        /* widget indisponível */
      }
    };

    if (window.VLibras?.Widget) {
      iniciarWidget();
      return () => observer.disconnect();
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${PLUGIN_URL}/vlibras-plugin.js`;
    script.async = true;
    script.onload = iniciarWidget;
    document.body.appendChild(script);

    return () => observer.disconnect();
  }, [hydrated, prefs.vlibras]);

  useEffect(() => {
    if (!hydrated) return;
    const el = document.getElementById(CONTAINER_ID);
    if (el) el.style.display = prefs.vlibras ? "" : "none";
  }, [prefs.vlibras, hydrated]);

  return null;
}
