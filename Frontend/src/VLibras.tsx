import { useEffect } from "react";
import { useAccessibility } from "@/lib/accessibility";

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

const CONTAINER_ID = "vlibras-container";

/**
 * Widget oficial VLibras (Governo Federal).
 * Fica fixo na tela, disponível em toda a navegação, sem afetar o layout.
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

    const script = document.createElement("script");
    script.id = "vlibras-plugin-script";
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.onload = () => {
      try {
        new window.VLibras!.Widget("https://vlibras.gov.br/app");
      } catch {
        /* widget indisponível */
      }
    };
    document.body.appendChild(script);
  }, [hydrated, prefs.vlibras]);

  useEffect(() => {
    if (!hydrated) return;
    const el = document.getElementById(CONTAINER_ID);
    if (el) el.style.display = prefs.vlibras ? "" : "none";
  }, [prefs.vlibras, hydrated]);

  return null;
}
