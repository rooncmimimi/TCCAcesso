import { CATALOGO } from "./catalogo/index.js";
import { IDIOMA_PADRAO, idiomaAtual } from "./idioma.js";

/**
 * Tradutor das mensagens do servidor.
 *
 * A chave é o próprio texto em português. Uma entrada sem `{marcadores}` casa por igualdade; uma
 * entrada com `{marcadores}` vira uma expressão regular que captura os pedaços variáveis (nome de
 * campo, título de vaga, status) e os recoloca na tradução. `{#n}` captura só dígitos e `{=x}`
 * captura um valor que também é traduzido (um status, uma lista de campos). O que uma pessoa
 * escreveu (nome, título, motivo, prévia de comentário) nunca é traduzido. Texto sem
 * entrada volta como veio — em português, que é melhor do que uma tela em branco —, e o teste
 * `catalogo.test.js` varre o código para que isso não aconteça sem alguém perceber.
 */

const MARCADOR = /\{[#=]?(\w+)\}/g;
const TEM_MARCADOR = /\{[#=]?\w+\}/;

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Mensagens em inglês que as bibliotecas produzem quando o código não define uma própria
 * (`express-validator` sem `.withMessage`). Viram a mensagem em português do catálogo antes de
 * qualquer tradução, para nenhum idioma — o português inclusive — mostrar inglês por acidente.
 */
const PADRAO_DAS_BIBLIOTECAS = new Map([["Invalid value", "Valor inválido."]]);

const exatas = new Map();
const padroes = [];

for (const [pt, en, es] of CATALOGO) {
    if (!TEM_MARCADOR.test(pt)) {
        exatas.set(pt, { en, es });
        continue;
    }

    const nomes = [];
    const comTraducao = new Set();
    let soDigitos = true;
    const fonte = escaparRegex(pt).replace(/\\\{([#=]?)(\w+)\\\}/g, (_, tipo, nome) => {
        nomes.push(nome);
        if (tipo === "=") comTraducao.add(nome);
        if (tipo !== "#") soDigitos = false;
        return tipo === "#" ? "(\\d+)" : "(.+?)";
    });

    padroes.push({
        regex: new RegExp(`^${fonte}$`, "s"),
        nomes,
        comTraducao,
        modelos: { en, es },
        // Padrão que só casa dígitos ("3 curtidas") nunca confunde texto digitado por alguém.
        soDigitos,
        // Quanto texto fixo o padrão tem: o mais específico é tentado primeiro (ver abaixo).
        especificidade: pt.replace(/\{#?\w+\}/g, "").length
    });
}

// Com `{marcadores}` que casam qualquer coisa, dois padrões podem servir ao mesmo texto — por
// exemplo, um comentário que cita "comentou:" dentro da prévia de uma resposta. Vence o que tem mais
// texto fixo, e não o que foi escrito primeiro no catálogo.
padroes.sort((a, b) => b.especificidade - a.especificidade);

/**
 * `texto` traduzido por igualdade ou por padrão, ou `null` quando o catálogo não o conhece.
 * `soSeguros` limita os padrões aos que só casam números: é como se traduz um pedaço capturado,
 * que pode ser texto digitado por alguém (a prévia de um comentário) e não pode ser tomado por
 * outra frase do catálogo.
 */
function procurar(texto, idioma, { soSeguros = false } = {}) {
    const exata = exatas.get(texto);
    if (exata) return exata[idioma] ?? null;

    for (const { regex, nomes, comTraducao, modelos, soDigitos } of padroes) {
        if (soSeguros && !soDigitos) continue;

        const encontrado = texto.match(regex);
        if (!encontrado) continue;

        const modelo = modelos[idioma];
        if (!modelo) return null;

        const valores = Object.fromEntries(
            nomes.map((nome, indice) => [
                nome,
                comTraducao.has(nome) ? traduzirValor(encontrado[indice + 1], idioma) : encontrado[indice + 1]
            ])
        );

        return modelo.replace(MARCADOR, (_, nome) => valores[nome] ?? "");
    }

    return null;
}

/**
 * O pedaço capturado por um marcador `{=x}` é, ele mesmo, um texto traduzível: um status
 * ("Em análise"), um campo ("data de nascimento") ou uma lista deles separada por vírgula ou
 * ponto e vírgula ("texto; 2 imagens; 3 curtidas"). Um valor que o catálogo não conhece fica como
 * está. Cada captura é menor que o texto inteiro, então a recursão termina.
 */
function traduzirValor(valor, idioma) {
    const direto = procurar(valor, idioma, { soSeguros: true });
    if (direto !== null) return direto;

    if (/[,;] /.test(valor)) {
        const partes = valor.split(/([,;] )/);
        let traduziuAlguma = false;

        const traduzidas = partes.map((parte) => {
            const traducao = /^[,;] $/.test(parte) ? null : procurar(parte, idioma, { soSeguros: true });
            if (traducao !== null) traduziuAlguma = true;
            return traducao ?? parte;
        });

        if (traduziuAlguma) return traduzidas.join("");
    }

    return valor;
}

/** `true` se `texto` tem tradução (exata ou por padrão). Usado pelo teste que varre o código. */
export function temTraducao(texto) {
    if (typeof texto !== "string") return false;

    return exatas.has(texto) || padroes.some(({ regex }) => regex.test(texto));
}

/** Traduz `texto` (em português) para `idioma`, que por padrão é o da requisição em andamento. */
export function traduzir(texto, idioma = idiomaAtual()) {
    if (typeof texto !== "string") return texto;

    const emPortugues = PADRAO_DAS_BIBLIOTECAS.get(texto) ?? texto;

    if (idioma === IDIOMA_PADRAO) return emPortugues;

    return procurar(emPortugues, idioma) ?? emPortugues;
}

/**
 * Traduz os textos de um corpo de resposta JSON: `mensagem` e `erros[].mensagem`. Devolve uma cópia
 * (nunca altera o objeto de quem chamou) e deixa o resto do corpo como está.
 */
export function traduzirCorpo(corpo, idioma = idiomaAtual()) {
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
        return corpo;
    }

    const traduzido = { ...corpo };

    if (typeof corpo.mensagem === "string") {
        traduzido.mensagem = traduzir(corpo.mensagem, idioma);
    }

    if (Array.isArray(corpo.erros)) {
        traduzido.erros = corpo.erros.map((erro) =>
            erro && typeof erro.mensagem === "string"
                ? { ...erro, mensagem: traduzir(erro.mensagem, idioma) }
                : erro
        );
    }

    return traduzido;
}
