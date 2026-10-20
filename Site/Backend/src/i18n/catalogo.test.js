import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOGO } from "./catalogo/index.js";
import { temTraducao, traduzir } from "./traduzir.js";

/*
 * O código escreve as mensagens em português e o servidor as traduz na saída. Este teste existe
 * para ninguém esquecer: ele varre o código-fonte atrás de texto em português que vai para a
 * pessoa (erro, validação, resposta, notificação) e falha se o catálogo não souber traduzi-lo.
 * Mensagem nova sem tradução quebra aqui, e não em produção, onde viraria um texto em português no
 * meio de uma tela em inglês.
 */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Texto que não é mostrado a ninguém: log, erro interno que vira "Erro interno do servidor.". */
const SO_PARA_LOG = new Set([
    "Origem não permitida pelo CORS.",
    "código sem perfil",
    "state sem nonce",
    "Falha ao enviar arquivo para o storage: X",
    "Falha ao gerar URL assinada: X",
    "Falha ao gerar URLs assinadas em lote: X"
]);

/** Textos que são, de verdade, iguais ao português no idioma indicado. */
const IGUAL_AO_PORTUGUES = new Set(["es: Registro duplicado."]);

function* arquivosDeCodigo(pasta) {
    for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
        const caminho = path.join(pasta, entrada.name);

        if (entrada.isDirectory()) {
            // `i18n` guarda os próprios textos traduzidos; `utils/textosEmail` e `modelosEmail` têm
            // os e-mails, que usam dicionário próprio (testado em `modelosEmail.test.js`).
            if (entrada.name !== "i18n") yield* arquivosDeCodigo(caminho);
        } else if (entrada.name.endsWith(".js") && !entrada.name.endsWith(".test.js")) {
            if (!/textosEmail|modelosEmail/.test(entrada.name)) yield caminho;
        }
    }
}

/** Remove comentários sem tocar no que está dentro de strings. */
function semComentarios(codigo) {
    let saida = "";
    let i = 0;

    while (i < codigo.length) {
        const c = codigo[i];
        const d = codigo[i + 1];

        if (c === "/" && d === "/") {
            while (i < codigo.length && codigo[i] !== "\n") i++;
            continue;
        }

        if (c === "/" && d === "*") {
            i += 2;
            while (i < codigo.length && !(codigo[i] === "*" && codigo[i + 1] === "/")) i++;
            i += 2;
            continue;
        }

        if (c === '"' || c === "'" || c === "`") {
            saida += c;
            i++;

            while (i < codigo.length && codigo[i] !== c) {
                if (codigo[i] === "\\") {
                    saida += codigo[i] + codigo[i + 1];
                    i += 2;
                    continue;
                }

                if (c === "`" && codigo[i] === "$" && codigo[i + 1] === "{") {
                    let profundidade = 0;
                    while (i < codigo.length) {
                        saida += codigo[i];
                        if (codigo[i] === "{") profundidade++;
                        if (codigo[i] === "}" && --profundidade === 0) {
                            i++;
                            break;
                        }
                        i++;
                    }
                    continue;
                }

                saida += codigo[i++];
            }

            saida += c;
            i++;
            continue;
        }

        saida += c;
        i++;
    }

    return saida;
}

const LITERAL = /`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g;

/**
 * A expressão que começa em `inicio`: vai até a vírgula, parêntese ou chave que a fecha, sem contar
 * os que estão dentro de strings, de chamadas ou de `${}`.
 */
function lerExpressao(codigo, inicio) {
    let profundidade = 0;
    let i = inicio;

    while (i < codigo.length) {
        const c = codigo[i];

        if (c === '"' || c === "'" || c === "`") {
            i++;
            while (i < codigo.length && codigo[i] !== c) {
                if (codigo[i] === "\\") i++;
                else if (c === "`" && codigo[i] === "$" && codigo[i + 1] === "{") {
                    let p = 0;
                    while (i < codigo.length) {
                        if (codigo[i] === "{") p++;
                        if (codigo[i] === "}" && --p === 0) break;
                        i++;
                    }
                }
                i++;
            }
            i++;
            continue;
        }

        if ("([{".includes(c)) profundidade++;

        if (")]}".includes(c)) {
            if (profundidade === 0) break;
            profundidade--;
        }

        if (c === "," && profundidade === 0) break;
        if (c === ";" && profundidade === 0) break;

        i++;
    }

    return codigo.slice(inicio, i);
}

/** Os textos que a expressão pode produzir: `"a" + "b"` é um só; `x ? "a" : "b"` são dois. */
function textosDaExpressao(expressao) {
    const literais = [...expressao.matchAll(LITERAL)].map((m) =>
        m[0]
            .slice(1, -1)
            .replace(/\\(["'`])/g, "$1")
            .replace(/\$\{[^}]*\}/g, "X")
    );

    if (literais.length > 1 && /^\s*(?:LIT\s*\+\s*)*LIT\s*$/.test(expressao.replace(LITERAL, "LIT"))) {
        return [literais.join("")];
    }

    return literais;
}

/**
 * Nos contextos varridos (erro, validação, resposta, notificação) todo texto de duas palavras ou
 * mais é mensagem para uma pessoa. Nada de adivinhar o idioma: um texto sem acento nem palavra
 * comum ("Empresa verificada no ACESSO") também precisa de tradução.
 */
function pareceMensagem(texto) {
    return /[A-Za-zÀ-ú]+ [A-Za-zÀ-ú]+/.test(texto);
}

/** O que cada contexto de código usa para mandar texto à pessoa. */
const CONTEXTOS = [
    /\bErroApi\.\w+\(\s*/g,
    /\bnew ErroApi\(\s*[^,]+,\s*/g,
    /\.withMessage\(\s*/g,
    /\b(?:\w*[Mm]ensagem\w*|titulo|descricao|motivo|aviso|msg)\s*[:=]\s*/g,
    /\bpontuar\((?:[^,()]+,){2}\s*/g
];

function mensagensDoCodigo() {
    const achadas = [];

    for (const arquivo of arquivosDeCodigo(RAIZ)) {
        const codigo = semComentarios(fs.readFileSync(arquivo, "utf8"));

        for (const contexto of CONTEXTOS) {
            for (const encontro of codigo.matchAll(contexto)) {
                const expressao = lerExpressao(codigo, encontro.index + encontro[0].length);

                for (const texto of textosDaExpressao(expressao)) {
                    if (pareceMensagem(texto)) {
                        achadas.push({ arquivo: path.relative(RAIZ, arquivo), texto });
                    }
                }
            }
        }
    }

    return achadas;
}

describe("catálogo de tradução das mensagens do servidor", () => {
    it("o código tem mensagens em português para varrer (o teste não está olhando para o vazio)", () => {
        expect(mensagensDoCodigo().length).toBeGreaterThan(150);
    });

    it("toda mensagem em português que vai para a pessoa tem tradução para inglês e espanhol", () => {
        const semTraducao = mensagensDoCodigo().filter(
            ({ texto }) => !SO_PARA_LOG.has(texto) && !temTraducao(texto)
        );

        const resumo = semTraducao.map(({ arquivo, texto }) => `${arquivo}: ${JSON.stringify(texto)}`);

        expect([...new Set(resumo)]).toEqual([]);
    });

    it("as traduções de fato mudam o texto (não é só cópia do português)", () => {
        const copias = [];

        for (const { texto } of mensagensDoCodigo()) {
            if (SO_PARA_LOG.has(texto) || !temTraducao(texto)) continue;

            for (const idioma of ["en", "es"]) {
                const marca = `${idioma}: ${texto}`;

                if (traduzir(texto, idioma) === texto && !IGUAL_AO_PORTUGUES.has(marca)) {
                    copias.push(marca);
                }
            }
        }

        expect([...new Set(copias)]).toEqual([]);
    });
});

describe("integridade do catálogo", () => {
    it("toda entrada tem português, inglês e espanhol preenchidos", () => {
        for (const entrada of CATALOGO) {
            expect(entrada).toHaveLength(3);
            for (const texto of entrada) {
                expect(typeof texto).toBe("string");
                expect(texto.trim()).not.toBe("");
            }
        }
    });

    it("não há duas entradas com o mesmo texto em português", () => {
        const vistos = new Set();
        const repetidos = [];

        for (const [pt] of CATALOGO) {
            if (vistos.has(pt)) repetidos.push(pt);
            vistos.add(pt);
        }

        expect(repetidos).toEqual([]);
    });

    it("os marcadores {…} são os mesmos nos três idiomas", () => {
        const marcadores = (texto) =>
            [...texto.matchAll(/\{[#=]?(\w+)\}/g)].map((m) => m[1]).sort();

        const divergentes = CATALOGO.filter(([pt, en, es]) => {
            const esperado = marcadores(pt);
            const idiomas = [en, es].map((texto) => marcadores(texto));

            // Os sinais `#` e `=` só existem na chave em português (dizem como o marcador casa).
            return idiomas.some((m) => JSON.stringify(m) !== JSON.stringify(esperado));
        }).map(([pt]) => pt);

        expect(divergentes).toEqual([]);
    });

    it("inglês e espanhol não deixam sobrar acento português por distração (á/ã/ç…) onde só pode haver tradução", () => {
        // Espanhol usa á é í ó ú ñ ¿ ¡; ã õ ç são sinais de português que escapou.
        const suspeitos = CATALOGO.filter(([, en, es]) => /[ãõç]/i.test(en) || /[ãõç]/i.test(es)).map(
            ([pt]) => pt
        );

        expect(suspeitos).toEqual([]);
    });
});
