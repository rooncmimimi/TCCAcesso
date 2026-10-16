/**
 * Como ler as respostas do Google quando se confere a configuração sem entrar de verdade
 * (`npm run google:verificar`). Funções puras, para poderem ser testadas sem a rede.
 */

/**
 * A página para onde a tela de autorização do Google leva, depois dos redirecionamentos.
 *
 * Com o ID do cliente e o endereço de retorno cadastrados, o Google mostra a tela de login; com um
 * endereço de retorno que **não** está cadastrado, mostra a página de erro (`redirect_uri_mismatch`).
 * É a mesma diferença que a pessoa veria no navegador, e dispensa entrar com uma conta.
 */
export function classificarPaginaDeAutorizacao(urlFinal) {
    let caminho;
    try {
        caminho = new URL(urlFinal).pathname;
    } catch {
        return "desconhecido";
    }

    if (caminho.includes("/signin/oauth/error")) return "recusado";
    if (caminho.includes("/signin/identifier") || caminho.includes("/signin/oauth/consent") || caminho.includes("/accountchooser")) {
        return "aceito";
    }

    return "desconhecido";
}

/**
 * O que a troca de um código **inventado** diz sobre as credenciais. O Google confere o cliente
 * (ID e segredo) antes de olhar o código, então:
 *
 * - `invalid_grant`: as credenciais foram aceitas e só o código (falso, de propósito) é que não vale;
 * - `invalid_client`: o ID ou o segredo foram recusados (errado, trocado ou desativado);
 * - sem resposta do Google (falha de rede), não dá para concluir nada.
 */
export function classificarErroDaTroca(erro) {
    const codigo = erro?.response?.data?.error;

    if (codigo === "invalid_grant") return "aceito";
    if (codigo === "invalid_client" || codigo === "unauthorized_client") return "recusado";
    if (!erro?.response) return "sem-resposta";

    return "desconhecido";
}
