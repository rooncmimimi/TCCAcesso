/**
 * Tira de novo todos os prints da Central de Ajuda, em português, inglês e espanhol:
 *
 *     npm run ajuda:prints                      (todos)
 *     npm run ajuda:prints -- vagas-1-lista     (só alguns)
 *
 * Sobe uma API simulada (dados inventados; não toca em banco nenhum), o Vite apontado para ela e um
 * navegador sem janela, comandado pelo protocolo de depuração (sem dependências novas). Grava os
 * arquivos em `src/assets/ajuda/<idioma>/` e as medidas em `src/assets/ajuda/medidas.json`.
 *
 * Precisa do Node 22.18+ (lê os dicionários `.ts` direto) e de um Edge ou Chrome instalado; outro
 * caminho pode ser dado em `NAVEGADOR`.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { iniciarApiSimulada } from "./api-simulada.mjs";
import { passos } from "./passos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SAIDA = path.join(RAIZ, "src/assets/ajuda");
const MEDIDAS = path.join(SAIDA, "medidas.json");
const IDIOMAS = ["pt", "en", "es"];
const PORTA_API = 3999;
const PORTA_SITE = 5199;
const PORTA_NAVEGADOR = 9333;
const SITE = `http://localhost:${PORTA_SITE}`;
const ESCALA = 1.5;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const somente = new Set(process.argv.slice(2));

function acharNavegador() {
  const candidatos = [
    process.env.NAVEGADOR,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const achado = candidatos.find((c) => fs.existsSync(c));
  if (!achado) throw new Error("Nenhum Edge ou Chrome encontrado. Informe o caminho em NAVEGADOR.");
  return achado;
}

async function esperarResposta(url, descricao) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* ainda subindo */
    }
    await dormir(500);
  }
  throw new Error(`${descricao} não respondeu`);
}

function iniciarVite() {
  const binario = path.join(RAIZ, "node_modules/vite/bin/vite.js");
  return spawn(process.execPath, [binario, "--port", String(PORTA_SITE), "--strictPort"], {
    cwd: RAIZ,
    env: { ...process.env, VITE_API_URL: `http://localhost:${PORTA_API}/api` },
    stdio: "ignore",
  });
}

async function conectar() {
  let alvo;
  for (let i = 0; i < 80 && !alvo; i++) {
    try {
      alvo = await (await fetch(`http://127.0.0.1:${PORTA_NAVEGADOR}/json/new?about:blank`, { method: "PUT" })).json();
    } catch {
      await dormir(250);
    }
  }
  if (!alvo) throw new Error("o navegador não respondeu");
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const esperando = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    const pedido = msg.id && esperando.get(msg.id);
    if (!pedido) return;
    esperando.delete(msg.id);
    if (msg.error) pedido.falha(new Error(msg.error.message));
    else pedido.ok(msg.result);
  };
  return (metodo, params = {}) =>
    new Promise((ok, falha) => {
      esperando.set(++id, { ok, falha });
      ws.send(JSON.stringify({ id, method: metodo, params }));
    });
}

/** Ajudas que rodam dentro da página. */
const AJUDAS = `
  window.__ajuda = {
    texto(texto, seletor) {
      const limpo = (s) => (s || "").replace(/\\s+/g, " ").trim();
      return [...document.querySelectorAll(seletor)].find((e) => limpo(e.textContent) === texto && e.getClientRects().length > 0) || null;
    },
    async esperar(achar, limite = 15000) {
      const fim = Date.now() + limite;
      for (;;) {
        const e = achar();
        if (e) return e;
        if (Date.now() > fim) throw new Error("o elemento não apareceu");
        await new Promise((r) => setTimeout(r, 200));
      }
    },
    digitar(seletor, valor) {
      const el = document.querySelector(seletor);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, valor);
      for (const tipo of ["input", "change", "blur"]) el.dispatchEvent(new Event(tipo, { bubbles: true }));
    },
  };
`;

// Esconde o que flutua por cima e não faz parte do passo (VLibras, ajuda de leitura, avisos).
const LIMPAR = `
  (() => {
    const s = document.createElement("style");
    s.textContent = "[vw],.vw-access-button,[data-sonner-toaster],button.fixed.bottom-4.left-4{display:none!important} *{caret-color:transparent!important;scroll-behavior:auto!important}";
    document.head.appendChild(s);
  })()
`;

async function capturar(cdp, passo, idioma, avaliar) {
  const largura = passo.largura || 720;
  await cdp("Emulation.setDeviceMetricsOverride", { width: largura, height: passo.altura || 900, deviceScaleFactor: ESCALA, mobile: false });

  await cdp("Page.navigate", { url: `${SITE}/termos` });
  await dormir(600);
  await avaliar(`localStorage.clear(); sessionStorage.clear();
    localStorage.setItem("acesso:idioma", "${idioma}");
    localStorage.setItem("acesso:a11y-prefs", JSON.stringify({ voiceConsent: false, vlibras: false }));
    localStorage.setItem("acesso:voice-choice", "declined");
    ${passo.como ? `localStorage.setItem("acesso:accessToken", "token-${passo.como}"); localStorage.setItem("acesso:refreshToken", "r");` : ""}`);

  await cdp("Page.navigate", { url: SITE + passo.url });
  await dormir(1500);
  await avaliar(AJUDAS);

  const naPagina = (corpo) => avaliar(`(async () => { const a = window.__ajuda; const dormir = (ms) => new Promise((r) => setTimeout(r, ms)); ${corpo} })()`);

  if (passo.preparar) await naPagina(passo.preparar);
  const alvo = passo.destacar || passo.recorte;
  if (alvo) await naPagina(`await a.esperar(() => ${alvo});`);
  await dormir(900);
  await avaliar(LIMPAR);

  if (passo.destacar) {
    await naPagina(`const e = await a.esperar(() => ${passo.destacar}); e.style.outline = "4px solid #d92d20"; e.style.outlineOffset = "3px";`);
  }
  await dormir(300);

  const caixa = passo.recorte
    ? await naPagina(`const e = await a.esperar(() => ${passo.recorte}); e.scrollIntoView({ block: "start" }); const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };`)
    : null;

  const margem = passo.margem ?? 8;
  const clip = caixa
    ? {
        x: Math.max(0, Math.floor(caixa.x - margem)),
        // `fim`: o pedaço de BAIXO do elemento (onde está o botão), em vez do de cima.
        y: Math.max(0, Math.floor(passo.fim ? caixa.y + caixa.h + margem - Math.min(passo.alturaMaxima || 760, caixa.h + margem * 2) : caixa.y - margem)),
        width: Math.min(largura, Math.ceil(caixa.w + margem * 2)),
        height: Math.min(passo.alturaMaxima || 760, Math.ceil(caixa.h + margem * 2)),
        scale: 1,
      }
    : { x: 0, y: await avaliar("scrollY"), width: largura, height: passo.alturaMaxima || 600, scale: 1 };

  const { data } = await cdp("Page.captureScreenshot", { format: "webp", quality: 80, clip, captureBeyondViewport: true });
  return Buffer.from(data, "base64");
}

/** Largura e altura gravadas no próprio arquivo WebP. */
function medirWebp(b) {
  const formato = b.toString("ascii", 12, 16);
  if (formato === "VP8X") return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  if (formato === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  throw new Error("formato de WebP inesperado: " + formato);
}

async function main() {
  const dicionarios = {};
  for (const idioma of IDIOMAS) {
    dicionarios[idioma] = (await import(new URL(`../../src/i18n/dicionarios/${idioma}.ts`, import.meta.url)))[idioma];
  }
  const traduzir = (idioma) => (chave) => {
    const texto = dicionarios[idioma][chave];
    if (!texto) throw new Error(`chave de texto ausente (${idioma}): ${chave}`);
    return texto;
  };

  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "acesso-prints-"));
  let api, vite, navegador;
  const falhas = [];
  const medidas = fs.existsSync(MEDIDAS) ? JSON.parse(fs.readFileSync(MEDIDAS, "utf8")) : {};

  try {
    api = await iniciarApiSimulada(PORTA_API);
    vite = iniciarVite();
    await esperarResposta(SITE, "o Vite");
    navegador = spawn(
      acharNavegador(),
      ["--headless=new", `--remote-debugging-port=${PORTA_NAVEGADOR}`, `--user-data-dir=${perfil}`, "--hide-scrollbars", "--no-first-run", "--force-color-profile=srgb", "about:blank"],
      { stdio: "ignore" },
    );
    const cdp = await conectar();
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    const avaliar = async (expressao) => {
      const r = await cdp("Runtime.evaluate", { expression: expressao, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };

    for (const idioma of IDIOMAS) {
      fs.mkdirSync(path.join(SAIDA, idioma), { recursive: true });
      medidas[idioma] ??= {};
      for (const passo of passos(traduzir(idioma))) {
        if (somente.size && !somente.has(passo.nome)) continue;
        // Uma segunda tentativa cobre a primeira visita a uma tela, quando o Vite ainda está compilando.
        for (let tentativa = 1; ; tentativa++) {
          try {
            const imagem = await capturar(cdp, passo, idioma, avaliar);
            fs.writeFileSync(path.join(SAIDA, idioma, `${passo.nome}.webp`), imagem);
            medidas[idioma][passo.nome] = medirWebp(imagem);
            console.log(`${idioma} ${passo.nome} ${medidas[idioma][passo.nome].join("x")}`);
            break;
          } catch (erro) {
            if (tentativa < 2) continue;
            falhas.push(`${idioma} ${passo.nome}: ${erro.message.split("\n")[0]}`);
            console.log(`${idioma} ${passo.nome} FALHOU`);
            break;
          }
        }
      }
    }

    const ordenado = Object.fromEntries(IDIOMAS.map((i) => [i, Object.fromEntries(Object.entries(medidas[i] ?? {}).sort(([a], [b]) => a.localeCompare(b)))]));
    fs.writeFileSync(MEDIDAS, JSON.stringify(ordenado, null, 2) + "\n");
  } finally {
    // No Windows, matar o processo pai não encerra os filhos do navegador.
    if (navegador && process.platform === "win32") spawnSync("taskkill", ["/pid", String(navegador.pid), "/f", "/t"], { stdio: "ignore" });
    else navegador?.kill();
    vite?.kill();
    api?.close();
    await dormir(800);
    fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }

  if (falhas.length) {
    console.error(`\n${falhas.length} print(s) falharam. A tela provavelmente mudou; ajuste passos.mjs:\n  ${falhas.join("\n  ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nTodos os prints foram gravados.");
  }
}

await main();
process.exit(process.exitCode ?? 0);
