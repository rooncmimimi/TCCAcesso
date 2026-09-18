import env from "../config/env.js";

/**
 * Monta a URL absoluta de uma página do Frontend para links de e-mail (confirmação de cadastro,
 * redefinição de senha), a partir de `env.frontendUrl`, um caminho e parâmetros de busca.
 *
 * Nunca lança: com `FRONTEND_URL` mal configurada (sem `https://`), `new URL` falharia e o envio
 * viraria "Erro interno do servidor.". Nesse caso registra a causa no log (sem expor a variável) e
 * devolve `null`, e quem chama envia o e-mail só com o código de 6 dígitos, que não depende do
 * link. O problema de configuração fica visível no log, sem fingir sucesso.
 */
export function montarUrlFrontend(caminho, params = {}) {
    try {
        const url = new URL(caminho, env.frontendUrl);

        for (const [chave, valor] of Object.entries(params)) {
            url.searchParams.set(chave, valor);
        }

        return url.toString();
    } catch (erro) {
        console.error(
            JSON.stringify({
                nivel: "error",
                servico: "frontendUrl",
                acao: "montar_url",
                caminho,
                problema:
                    "FRONTEND_URL configurada de forma inválida — verifique se inclui o protocolo (ex.: https://).",
                detalheTecnico: erro.message
            })
        );
        return null;
    }
}
