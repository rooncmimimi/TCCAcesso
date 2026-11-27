// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

import { definirIdiomaDasFrases } from "./index";
import { doServidor, respostaDoServidor } from "./servidor";
import { FRASES_DO_SERVIDOR } from "./servidor.dados";
import { EN } from "./en";

const SERVIDOR = resolve(__dirname, "../../../../Backend/src");

const listar = (pasta: string): string[] =>
  readdirSync(pasta, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(resolve(pasta, e.name)) : [resolve(pasta, e.name)]));

/**
 * As mensagens que o servidor manda para a tela: erros (`ErroApi`, `withMessage`) e os campos
 * `mensagem`, `titulo` e `rotulo` escritos no código.
 */
function mensagensDoServidor(): Map<string, string> {
  const achadas = new Map<string, string>();
  for (const caminho of listar(SERVIDOR).filter((f) => f.endsWith(".js") && !f.endsWith(".test.js") && !/modelosEmail|avisoEmail/.test(f))) {
    const arvore = ts.createSourceFile(caminho, readFileSync(caminho, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const guardar = (no: ts.Expression) => {
      let texto: string | null = null;
      if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) texto = no.text;
      else if (ts.isTemplateExpression(no)) texto = no.head.text + no.templateSpans.map((p, i) => `{${i}}${p.literal.text}`).join("");
      else if (ts.isConditionalExpression(no)) [no.whenTrue, no.whenFalse].forEach(guardar);
      // Só frase: chave, identificador e valor de banco não têm espaço.
      if (texto && /\p{L}{2,}.* /u.test(texto.trim())) achadas.set(texto, relative(SERVIDOR, caminho).replace(/\\/g, "/"));
    };
    const percorrer = (no: ts.Node) => {
      if (ts.isCallExpression(no) || ts.isNewExpression(no)) {
        const alvo = no.expression.getText();
        if (/^ErroApi(\.\w+)?$|\.withMessage$|^withMessage$/.test(alvo)) for (const arg of no.arguments ?? []) guardar(arg);
      }
      if (ts.isPropertyAssignment(no) && /^(mensagem|titulo|rotulo)$/.test(no.name.getText())) guardar(no.initializer);
      ts.forEachChild(no, percorrer);
    };
    percorrer(arvore);
  }
  return achadas;
}

afterEach(() => definirIdiomaDasFrases(null));

describe("mensagens do servidor", () => {
  it("têm tradução, todas", () => {
    const conhecidas = new Set<string>([...FRASES_DO_SERVIDOR.map(([pt]) => pt), ...Object.keys(EN)]);
    const faltam = [...mensagensDoServidor()].filter(([pt]) => !conhecidas.has(pt)).map(([pt, arquivo]) => `${arquivo}: ${pt}`);

    expect(faltam).toEqual([]);
  });

  it("mantêm os marcadores nos dois idiomas", () => {
    const marcadores = (t: string) => (t.match(/\{\d\}/g) ?? []).sort().join();

    expect(FRASES_DO_SERVIDOR.filter(([pt, en, es]) => marcadores(en) !== marcadores(pt) || marcadores(es) !== marcadores(pt))).toEqual([]);
  });

  it("ficam em português quando o site está em português", () => {
    definirIdiomaDasFrases("pt");

    expect(doServidor("Vaga não encontrada.")).toBe("Vaga não encontrada.");
  });

  it("encaixam o que varia na frase traduzida", () => {
    definirIdiomaDasFrases("en");

    expect(doServidor('Ana Souza se candidatou à vaga "Auxiliar".')).toBe('Ana Souza applied for the job "Auxiliar".');
    expect(doServidor('Sua candidatura para a vaga "Auxiliar" foi atualizada para Em análise.')).toBe('Your application for the job "Auxiliar" was updated to Under review.');
    expect(doServidor("Código incorreto. Você ainda tem 2 tentativas.")).toBe("Incorrect code. You still have 2 attempts.");
  });

  it("traduzem a lista do registro de moderação e preservam os nomes", () => {
    definirIdiomaDasFrases("es");

    expect(doServidor("Ana removeu uma publicação de um usuário removido. A publicação continha: texto; 2 imagens; 1 curtida; 0 comentários.")).toBe(
      "Ana eliminó una publicación de un usuario eliminado. La publicación contenía: texto; 2 imágenes; 1 me gusta; 0 comentarios.",
    );
  });

  it("devolvem como veio o que não conhecem", () => {
    definirIdiomaDasFrases("en");

    expect(doServidor("Auxiliar administrativo na Padaria do João")).toBe("Auxiliar administrativo na Padaria do João");
  });

  it("só mexem nos campos que o sistema escreve", () => {
    definirIdiomaDasFrases("en");
    const corpo = { notificacoes: [{ titulo: "Novo seguidor", descricao: "Ana começou a seguir sua empresa." }] };

    expect(respostaDoServidor("/notificacoes", corpo)).toEqual({ notificacoes: [{ titulo: "New follower", descricao: "Ana started following your company." }] });
    // O título de uma vaga é de quem escreveu, mesmo que coincida com uma frase do sistema.
    expect(respostaDoServidor("/vagas", { titulo: "Novo seguidor", opcoes: [{ rotulo: "Silencioso" }] })).toEqual({ titulo: "Novo seguidor", opcoes: [{ rotulo: "Quiet" }] });
  });
});
