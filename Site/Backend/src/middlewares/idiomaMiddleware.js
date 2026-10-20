import { executarComIdioma, idiomaDoCabecalho, IDIOMA_PADRAO } from "../i18n/idioma.js";
import { traduzirCorpo } from "../i18n/traduzir.js";

/**
 * Resolve o idioma da requisição e traduz os textos da resposta.
 *
 * O idioma vem do `Accept-Language` (o Site sempre o manda, com o idioma escolhido na interface).
 * Sem ele, o `autenticacaoMiddleware` ainda pode adotar o idioma salvo na conta; sem conta,
 * vale o português. O idioma fica em `req.idioma` e, depois de `contextoDeIdioma`, num
 * AsyncLocalStorage (ver `i18n/idioma.js`).
 *
 * `res.json` é embrulhado para traduzir `mensagem` e `erros[].mensagem`, que é onde os controllers
 * e os middlewares de validação e de erro colocam os textos para a pessoa: assim nenhuma rota
 * precisa lembrar de traduzir, e o código continua escrevendo as mensagens em português. O
 * embrulho depende só de `req`, nunca do AsyncLocalStorage, então vale até para as recusas que
 * acontecem antes dele (CORS e leitura do corpo).
 */
export default function idiomaMiddleware(req, res, next) {
    const pedido = idiomaDoCabecalho(req.headers["accept-language"]);

    req.idioma = pedido ?? IDIOMA_PADRAO;
    req.idiomaPedido = pedido !== null;

    const jsonOriginal = res.json.bind(res);

    res.json = (corpo) => {
        // `req.idioma` acompanha o contexto: a autenticação pode trocá-lo pelo da conta.
        res.setHeader("Content-Language", req.idioma);
        return jsonOriginal(traduzirCorpo(corpo, req.idioma));
    };

    res.vary("Accept-Language");
    next();
}

/**
 * Abre o contexto de idioma (AsyncLocalStorage) para tudo que vem depois. Fica depois dos parsers
 * de corpo de propósito: o contexto se perde nos callbacks de eventos do stream da requisição, que
 * é como o parser entrega o `next()`, e abrir antes dele deixaria os services sem idioma.
 */
export function contextoDeIdioma(req, res, next) {
    executarComIdioma(req.idioma, next, { explicito: req.idiomaPedido });
}
