/**
 * Descrição curta do aparelho a partir do `user-agent`, para os e-mails e a lista de dispositivos de confiança ("Chrome ·
 * Windows"). É o que o próprio cliente informa: serve para a pessoa reconhecer o aparelho, não prova nada. O Site tem a mesma
 * regra (`lib/dispositivo.ts`).
 */
export function rotuloDoDispositivo(userAgent) {
    if (!userAgent || !String(userAgent).trim()) {
        return "Dispositivo desconhecido";
    }

    const ua = String(userAgent).toLowerCase();

    const sistema = ua.includes("android")
        ? "Android"
        : /iphone|ipad|ipod/.test(ua)
          ? "iOS"
          : ua.includes("cros")
            ? "ChromeOS"
            : ua.includes("windows")
              ? "Windows"
              : ua.includes("mac os") || ua.includes("macintosh")
                ? "macOS"
                : ua.includes("linux")
                  ? "Linux"
                  : "";

    const navegador =
        ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")
            ? "Edge"
            : ua.includes("opr/") || ua.includes("opera")
              ? "Opera"
              : ua.includes("samsungbrowser")
                ? "Samsung Internet"
                : ua.includes("firefox/") || ua.includes("fxios/")
                  ? "Firefox"
                  : ua.includes("chrome/") || ua.includes("crios/")
                    ? "Chrome"
                    : ua.includes("safari/")
                      ? "Safari"
                      : "Navegador";

    return sistema ? `${navegador} · ${sistema}` : navegador;
}

/** "ped***@gmail.com": para dizer a quem entra para onde o código foi, sem expor o endereço inteiro. */
export function mascararEmail(email) {
    const [usuario, dominio] = String(email ?? "").split("@");

    if (!dominio) return "***";

    return `${usuario.slice(0, Math.min(2, usuario.length))}***@${dominio}`;
}
