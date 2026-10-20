import auditoria from "./auditoria.js";
import autenticacao from "./autenticacao.js";
import geral from "./geral.js";
import recursos from "./recursos.js";
import social from "./social.js";
import validacao from "./validacao.js";

/**
 * Catálogo de tradução das mensagens do servidor: lista de `[pt, en, es]`. O texto em português é
 * a chave; `{marcador}` captura um pedaço variável (nome, título, motivo — nunca traduzido),
 * `{#marcador}` captura só dígitos e `{=marcador}` captura um valor que também é traduzido (status,
 * lista de campos).
 */
export const CATALOGO = [
    ...geral,
    ...autenticacao,
    ...validacao,
    ...recursos,
    ...social,
    ...auditoria
];
