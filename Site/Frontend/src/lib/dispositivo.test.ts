import { describe, it, expect } from "vitest";

import { dataHoraCurta, descreverDispositivo, tempoRelativo } from "./dispositivo";

const UA = {
  chromeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  edgeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  safariIpad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
  chromeAndroidTablet: "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36",
  opera: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 OPR/106.0",
  chromeOs: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  appAndroid: "okhttp/4.12.0",
};

describe("descreverDispositivo", () => {
  it.each([
    [UA.chromeWindows, "Chrome · Windows", "computador"],
    [UA.edgeWindows, "Edge · Windows", "computador"],
    [UA.firefoxLinux, "Firefox · Linux", "computador"],
    [UA.safariMac, "Safari · macOS", "computador"],
    [UA.safariIphone, "Safari · iOS", "celular"],
    [UA.safariIpad, "Safari · iOS", "tablet"],
    [UA.chromeAndroid, "Chrome · Android", "celular"],
    [UA.chromeAndroidTablet, "Chrome · Android", "tablet"],
    [UA.firefoxAndroid, "Firefox · Android", "celular"],
    [UA.samsung, "Samsung Internet · Android", "celular"],
    [UA.opera, "Opera · Windows", "computador"],
    [UA.chromeOs, "Chrome · ChromeOS", "computador"],
  ] as const)("%s", (ua, rotulo, tipo) => {
    const d = descreverDispositivo(ua);

    expect(d.rotulo).toBe(rotulo);
    expect(d.tipo).toBe(tipo);
  });

  it("Edge e Opera não viram Chrome, e Chrome não vira Safari (a ordem dos testes importa)", () => {
    expect(descreverDispositivo(UA.edgeWindows).navegador).toBe("Edge");
    expect(descreverDispositivo(UA.opera).navegador).toBe("Opera");
    expect(descreverDispositivo(UA.chromeWindows).navegador).toBe("Chrome");
  });

  it("Android não vira Linux, e iPhone não vira macOS", () => {
    expect(descreverDispositivo(UA.chromeAndroid).sistema).toBe("Android");
    expect(descreverDispositivo(UA.safariIphone).sistema).toBe("iOS");
  });

  it("o aplicativo do ACESSO é reconhecido", () => {
    const d = descreverDispositivo(UA.appAndroid);

    expect(d.tipo).toBe("aplicativo");
    expect(d.rotulo).toBe("Aplicativo ACESSO");
  });

  it.each([[null], [undefined], [""], ["   "]])("sem user-agent (%j): dispositivo desconhecido", (ua) => {
    expect(descreverDispositivo(ua)).toMatchObject({ rotulo: "Dispositivo desconhecido", tipo: "desconhecido" });
  });

  it("texto qualquer não quebra: vira 'Navegador'", () => {
    expect(descreverDispositivo("qualquer coisa").rotulo).toBe("Navegador");
  });
});

describe("tempoRelativo", () => {
  const agora = new Date("2026-11-03T12:00:00Z").getTime();
  const antes = (ms: number) => new Date(agora - ms).toISOString();

  it("menos de um minuto: 'há menos de um minuto'", () => {
    expect(tempoRelativo(antes(20_000), agora)).toBe("há menos de um minuto");
  });

  it.each([
    [5 * 60_000, "há 5 minutos"],
    [3 * 3_600_000, "há 3 horas"],
    [24 * 3_600_000, "ontem"],
    [4 * 24 * 3_600_000, "há 4 dias"],
    [100 * 24 * 3_600_000, "há 3 meses"],
  ])("%i ms atrás: %s", (ms, esperado) => {
    expect(tempoRelativo(antes(ms), agora)).toBe(esperado);
  });

  it.each([[null], [undefined], [""], ["isso não é data"]])("entrada inválida (%j) vira texto vazio, nunca 'NaN'", (valor) => {
    expect(tempoRelativo(valor as string, agora)).toBe("");
  });
});

describe("dataHoraCurta", () => {
  it("formata em pt-BR", () => {
    expect(dataHoraCurta("2026-11-03T15:30:00Z")).toMatch(/^\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}$/);
  });

  it.each([[null], [undefined], [""], ["lixo"]])("entrada inválida (%j) vira vazio", (valor) => {
    expect(dataHoraCurta(valor as string)).toBe("");
  });
});
