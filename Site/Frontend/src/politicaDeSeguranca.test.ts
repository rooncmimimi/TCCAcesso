import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Os cabeçalhos de segurança do Site (`vercel.json`, achado 13 da auditoria). A política foi montada
 * olhando o que o Site e o VLibras realmente carregam (ver `Site/docs/cabecalhos-de-seguranca.md`);
 * estes testes não a refazem, só impedem que ela seja afrouxada sem querer — um `'unsafe-eval'`, um
 * `*` ou o CDN inteiro liberado — ou que perca o que o Site precisa.
 */

type Cabecalho = { key: string; value: string };

// O Vitest roda na pasta do projeto (`npm test`), onde fica o vercel.json.
const lerVercel = () => JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"));

const vercel = lerVercel() as {
  headers: { source: string; headers: Cabecalho[] }[];
};

const regra = vercel.headers.find((item) => item.source === "/(.*)");
const cabecalho = (nome: string) => regra?.headers.find((item) => item.key === nome)?.value;

/** `"a 'self' b; c d"` vira `{ a: ["'self'", "b"], c: ["d"] }`. */
function diretivas(politica: string): Record<string, string[]> {
  return Object.fromEntries(
    politica
      .split(";")
      .map((parte) => parte.trim().split(/\s+/))
      .filter((partes) => partes[0])
      .map(([nome, ...fontes]) => [nome, fontes]),
  );
}

const politica = diretivas(cabecalho("Content-Security-Policy") ?? "");

const JSDELIVR_DO_VLIBRAS = "https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/";
const API = "https://acesso-backend.onrender.com";

describe("cabeçalhos aplicados a todas as páginas", () => {
  it("o vercel.json define os cabeçalhos para qualquer caminho", () => {
    expect(regra).toBeDefined();
  });

  it("não manda o endereço da página a outros sites (o retorno do Google e os links de e-mail levam códigos)", () => {
    expect(cabecalho("Referrer-Policy")).toBe("no-referrer");
  });

  it("tem uma política de conteúdo", () => {
    expect(Object.keys(politica).length).toBeGreaterThan(5);
  });

  it("mantém o rewrite do SPA: toda rota cai no index.html", () => {
    expect(lerVercel().rewrites).toEqual([{ source: "/(.*)", destination: "/index.html" }]);
  });
});

describe("política de conteúdo: o que ela proíbe", () => {
  it("parte de 'self' para tudo que não foi liberado de propósito", () => {
    expect(politica["default-src"]).toEqual(["'self'"]);
  });

  it("não executa script inline nem eval", () => {
    expect(politica["script-src"]).not.toContain("'unsafe-inline'");
    expect(politica["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("não aceita curinga, http: nem data: em script-src", () => {
    for (const fonte of politica["script-src"]) {
      expect(fonte).not.toBe("*");
      expect(fonte).not.toMatch(/^(http:|data:|blob:)/);
    }
  });

  it("bloqueia plugins, troca de base e o Site dentro de quadro de outro site", () => {
    expect(politica["object-src"]).toEqual(["'none'"]);
    expect(politica["base-uri"]).toEqual(["'self'"]);
    expect(politica["frame-ancestors"]).toEqual(["'none'"]);
    expect(politica["form-action"]).toEqual(["'self'"]);
  });

  it("nenhuma diretiva libera tudo (*) ou qualquer https:", () => {
    for (const [nome, fontes] of Object.entries(politica)) {
      expect(fontes, nome).not.toContain("*");
      expect(fontes, nome).not.toContain("https:");
    }
  });

  it("só o VLibras entra em script-src, e o jsDelivr só no caminho do VLibras (nunca o CDN inteiro)", () => {
    expect(politica["script-src"]).toEqual(["'self'", "https://vlibras.gov.br", JSDELIVR_DO_VLIBRAS]);
    expect(politica["script-src"]).not.toContain("https://cdn.jsdelivr.net");
  });

  it("só o VLibras pode ser colocado em quadro", () => {
    expect(politica["frame-src"]).toEqual(["https://vlibras.gov.br"]);
  });
});

describe("política de conteúdo: o que o Site precisa", () => {
  it("fala com a API, por HTTPS e por WebSocket (socket.io)", () => {
    expect(politica["connect-src"]).toContain(API);
    expect(politica["connect-src"]).toContain("wss://acesso-backend.onrender.com");
  });

  it("consulta o IBGE (cidades) e o armazenamento de arquivos", () => {
    expect(politica["connect-src"]).toContain("https://servicodados.ibge.gov.br");
    expect(politica["connect-src"]).toContain("https://*.supabase.co");
  });

  it("mostra imagens e vídeos dos anexos (armazenamento, API e blobs de pré-visualização)", () => {
    expect(politica["img-src"]).toEqual(expect.arrayContaining(["'self'", "data:", "blob:", "https://*.supabase.co", API]));
    expect(politica["media-src"]).toEqual(expect.arrayContaining(["'self'", "blob:", "https://*.supabase.co", API]));
  });

  it("carrega as fontes do Google Fonts e a fonte para dislexia", () => {
    expect(politica["style-src"]).toEqual(expect.arrayContaining(["https://fonts.googleapis.com", "https://fonts.cdnfonts.com"]));
    expect(politica["font-src"]).toEqual(expect.arrayContaining(["https://fonts.gstatic.com", "https://fonts.cdnfonts.com"]));
  });

  it("aceita estilos inline, que as bibliotecas de interface injetam", () => {
    expect(politica["style-src"]).toContain("'unsafe-inline'");
  });

  it("deixa o VLibras carregar o que ele pede: scripts, imagens e fontes do seu próprio caminho no jsDelivr", () => {
    for (const diretiva of ["script-src", "img-src", "font-src"]) {
      expect(politica[diretiva], diretiva).toContain(JSDELIVR_DO_VLIBRAS);
    }
  });
});
