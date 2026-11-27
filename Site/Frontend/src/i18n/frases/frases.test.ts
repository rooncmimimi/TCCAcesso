// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

import { EN } from "./en";
import { ES } from "./es";

/**
 * Barra texto em português que ficaria sem tradução:
 * 1. toda frase passada a `tx` tem inglês e espanhol, com os mesmos marcadores;
 * 2. nenhuma tela tem texto escrito direto, fora de `tx`/`t`.
 */

const SRC = resolve(__dirname, "../..");

const listar = (pasta: string): string[] =>
  readdirSync(pasta, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(resolve(pasta, e.name)) : [resolve(pasta, e.name)]));

const FONTES = listar(SRC)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.|[\\/]i18n[\\/]frases[\\/]/.test(f))
  .map((caminho) => ({
    nome: relative(SRC, caminho).replace(/\\/g, "/"),
    arvore: ts.createSourceFile(caminho, readFileSync(caminho, "utf8"), ts.ScriptTarget.Latest, true),
  }));

function percorrer(no: ts.Node, ver: (no: ts.Node) => void) {
  ver(no);
  ts.forEachChild(no, (filho) => percorrer(filho, ver));
}

const textoFixo = (no: ts.Node): string | null => (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no) ? no.text : null);

/** As frases que o código passa a `tx`, já no formato de chave das tabelas ("Etapa {0} de {1}"). */
function frasesUsadas(): Map<string, string> {
  const usadas = new Map<string, string>();
  for (const { nome, arvore } of FONTES) {
    const guardar = (frase: string) => {
      if (/\p{L}/u.test(frase)) usadas.set(frase, nome);
    };
    percorrer(arvore, (no) => {
      if (ts.isTaggedTemplateExpression(no) && no.tag.getText() === "tx") {
        const molde = no.template;
        if (ts.isNoSubstitutionTemplateLiteral(molde)) guardar(molde.text);
        else guardar(molde.head.text + molde.templateSpans.map((p, i) => `{${i}}${p.literal.text}`).join(""));
      }
      if (ts.isCallExpression(no) && no.expression.getText() === "tx" && no.arguments[0]) {
        // `tx("a")` e `tx(x ? "a" : "b")`; o valor que só existe em execução fica com quem o declara.
        const visitar = (arg: ts.Expression) => {
          const fixo = textoFixo(arg);
          if (fixo !== null) guardar(fixo);
          else if (ts.isConditionalExpression(arg)) [arg.whenTrue, arg.whenFalse].forEach(visitar);
          else if (ts.isParenthesizedExpression(arg)) visitar(arg.expression);
        };
        visitar(no.arguments[0]);
      }
    });
  }
  return usadas;
}

const marcadores = (frase: string) => (frase.match(/\{\d\}/g) ?? []).sort().join();

describe.each([
  ["inglês", EN],
  ["espanhol", ES],
] as const)("frases em %s", (_, tabela) => {
  it("traduz toda frase usada no site", () => {
    const faltam = [...frasesUsadas()].filter(([frase]) => !(frase in tabela)).map(([frase, arquivo]) => `${arquivo}: ${frase}`);

    expect(faltam).toEqual([]);
  });

  it("mantém os marcadores e não deixa tradução vazia", () => {
    const erradas = Object.entries(tabela).filter(([pt, traduzida]) => marcadores(pt) !== marcadores(traduzida) || (pt.trim() !== "" && traduzida.trim() === ""));

    expect(erradas).toEqual([]);
  });
});

describe("texto direto na tela", () => {
  /** Nomes próprios e siglas, iguais nos três idiomas. */
  const IGUAIS_EM_TODO_IDIOMA = new Set(["ACESSO", "CEP", "CNPJ", "GitHub", "Google", "projetoacessoinclusivo@gmail.com"]);

  it("não existe fora de `tx` e `t`", () => {
    const soltos: string[] = [];
    for (const { nome, arvore } of FONTES) {
      if (!nome.endsWith(".tsx") || nome.startsWith("components/ui/")) continue;
      percorrer(arvore, (no) => {
        if (!ts.isJsxText(no)) return;
        const texto = no.text.replace(/&[a-z]+;/g, "").trim();
        if (/\p{L}{2,}/u.test(texto) && !IGUAIS_EM_TODO_IDIOMA.has(texto)) soltos.push(`${nome}: ${texto}`);
      });
    }

    expect(soltos).toEqual([]);
  });

  it("não existe em atributo lido pela pessoa nem em aviso", () => {
    const LIDOS = /^(aria-label|aria-description|aria-roledescription|aria-valuetext|alt|title|placeholder|label|rotulo|descricao|titulo)$/;
    const soltos: string[] = [];
    for (const { nome, arvore } of FONTES) {
      if (nome.startsWith("components/ui/") || nome.startsWith("dados/documentosLegais")) continue;
      percorrer(arvore, (no) => {
        const texto =
          ts.isJsxAttribute(no) && LIDOS.test(no.name.getText()) && no.initializer
            ? textoFixo(no.initializer)
            : ts.isCallExpression(no) && /^toast(\.\w+)?$/.test(no.expression.getText()) && no.arguments[0]
              ? textoFixo(no.arguments[0])
              : null;
        // Frase de verdade tem espaço ou acento; identificador e chave de tradução não.
        if (texto && !IGUAIS_EM_TODO_IDIOMA.has(texto) && /\p{L}.* \p{L}|[ãõçáéíóúâêô]/iu.test(texto)) soltos.push(`${nome}: ${texto}`);
      });
    }

    expect(soltos).toEqual([]);
  });
});
