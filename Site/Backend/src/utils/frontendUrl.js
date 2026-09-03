import env from "../config/env.js";

/**
 * Monta uma URL absoluta do Frontend (usada em links de e-mail —
 * confirmação de cadastro, redefinição de senha) a partir de
 * `env.frontendUrl` + um caminho + parâmetros de busca.
 *
 * Nunca lança: uma `FRONTEND_URL` mal configurada (ex.: sem o esquema
 * `https://`) fazia `new URL(caminho, base)` lançar `TypeError: Invalid
 * URL` direto de dentro de `RecuperacaoSenhaService`/`authService`, sem
 * nenhum tratamento — virava uma exceção crua até o `errorMiddleware`,
 * respondendo "Erro interno do servidor." tanto para "esqueci minha
 * senha" quanto para o reenvio de confirmação de cadastro (o mesmo bug
 * duplicado nos dois arquivos — causa raiz confirmada por reprodução).
 *
 * Em vez disso, registra a causa técnica (nunca na resposta ao cliente,
 * nunca a `FRONTEND_URL` em si) e devolve `null` — quem chama trata a
 * ausência de link como "e-mail só com o código", nunca cancela o envio:
 * o código de 6 dígitos é sempre o mecanismo principal de confirmação/
 * redefinição e nunca depende de `FRONTEND_URL`; o link é só conveniência
 * de um clique. Isso é diferente de "engolir o erro e fingir sucesso" —
 * o problema de configuração fica bem visível no log do servidor,
 * exatamente o que faltava antes.
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
