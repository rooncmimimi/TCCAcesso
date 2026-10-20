import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Idioma da requisição e da conta (pt, en, es).
 *
 * O português é o idioma do código-fonte: as mensagens continuam escritas em português onde nascem
 * (ErroApi, validadores, services) e são traduzidas só na saída, em `traduzir.js`. Por isso o
 * `err.message` dos erros, os testes e os logs seguem em português, e `pt` é sempre o idioma de
 * reserva — idioma desconhecido, cabeçalho ausente ou mensagem sem tradução caem nele.
 */
export const IDIOMAS = ["pt", "en", "es"];
export const IDIOMA_PADRAO = "pt";

export const ehIdioma = (valor) => IDIOMAS.includes(valor);

/**
 * Lê o `Accept-Language` e devolve o primeiro idioma suportado pela ordem de preferência (`q`),
 * ou `null` quando o cabeçalho falta ou só lista idiomas que a plataforma não tem.
 * `pt-BR` e `pt-PT` viram `pt`, `en-US` vira `en`, `es-419` vira `es`.
 */
export function idiomaDoCabecalho(cabecalho) {
    if (typeof cabecalho !== "string" || !cabecalho.trim()) return null;

    const preferencias = cabecalho
        .split(",")
        .map((parte, ordem) => {
            const [tag, ...parametros] = parte.trim().split(";");
            const q = parametros
                .map((parametro) => parametro.trim().match(/^q=([\d.]+)$/i))
                .find(Boolean);

            return {
                idioma: tag.trim().toLowerCase().split("-")[0],
                q: q ? Number(q[1]) : 1,
                ordem
            };
        })
        .filter((preferencia) => preferencia.q > 0)
        .sort((a, b) => b.q - a.q || a.ordem - b.ordem);

    return preferencias.find((preferencia) => ehIdioma(preferencia.idioma))?.idioma ?? null;
}

/*
 * O idioma da requisição viaja num AsyncLocalStorage, e não por parâmetro, porque as mensagens
 * nascem a quatro camadas de distância de `req` (service → util → ErroApi). O objeto guardado é
 * mutável de propósito: o middleware de autenticação ainda pode trocar o idioma pelo da conta
 * depois que a requisição já começou.
 */
const armazenamento = new AsyncLocalStorage();

/** Executa `fn` com `idioma` como idioma corrente. `explicito` diz se o cliente o pediu de fato. */
export function executarComIdioma(idioma, fn, { explicito = false } = {}) {
    return armazenamento.run({ idioma: ehIdioma(idioma) ? idioma : IDIOMA_PADRAO, explicito }, fn);
}

/** Idioma da requisição em andamento (ou `pt` fora de uma requisição). */
export function idiomaAtual() {
    return armazenamento.getStore()?.idioma ?? IDIOMA_PADRAO;
}

/** `true` quando o cliente mandou o idioma (`Accept-Language`) nesta requisição. */
export function idiomaFoiPedido() {
    return Boolean(armazenamento.getStore()?.explicito);
}

/**
 * Adota o idioma salvo na conta quando o cliente não pediu um. O Site sempre manda
 * `Accept-Language`; quem não manda (o app Android, scripts) fica com a preferência da conta.
 */
export function adotarIdiomaDaConta(req, usuario) {
    const contexto = armazenamento.getStore();

    if (!contexto || contexto.explicito || !ehIdioma(usuario?.idioma)) return;

    contexto.idioma = usuario.idioma;
    if (req) req.idioma = usuario.idioma;
}

/**
 * Idioma para um texto que sai por fora da resposta (e-mail, push) endereçado a `usuario`.
 * Quando é o próprio destinatário quem fez a requisição e escolheu um idioma, vale o que ele
 * escolheu agora; senão, o idioma salvo na conta dele — nunca o de quem agiu (um administrador
 * bloqueando uma conta não pode fazer o aviso sair no idioma do administrador).
 */
export function idiomaDoDestinatario(usuario, { daRequisicao = false } = {}) {
    if (daRequisicao && idiomaFoiPedido()) return idiomaAtual();

    return ehIdioma(usuario?.idioma) ? usuario.idioma : IDIOMA_PADRAO;
}
