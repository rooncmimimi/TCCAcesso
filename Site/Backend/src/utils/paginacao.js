/**
 * Normaliza os parâmetros de paginação vindos da query string.
 *
 * Protege contra DoS por paginação (limit=999999) e contra
 * valores não numéricos que quebrariam a query.
 */
export const resolverPaginacao = (query = {}, limitePadrao = 10) => {
    const paginaBruta = Number.parseInt(query.page, 10);
    const limiteBruto = Number.parseInt(query.limit, 10);

    const pagina =
        Number.isInteger(paginaBruta) && paginaBruta > 0 ? paginaBruta : 1;

    const limite =
        Number.isInteger(limiteBruto) && limiteBruto > 0
            ? Math.min(limiteBruto, 100)
            : limitePadrao;

    return {
        pagina,
        limite,
        offset: (pagina - 1) * limite
    };
};

/**
 * Monta o envelope padrão de resposta paginada.
 */
export const montarResposta = (chave, rows, count, pagina, limite) => {
    return {
        total: count,
        pagina,
        limite,
        totalPaginas: limite > 0 ? Math.ceil(count / limite) : 0,
        [chave]: rows
    };
};
