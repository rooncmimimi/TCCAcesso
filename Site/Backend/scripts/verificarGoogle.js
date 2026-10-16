/**
 * Confere a configuração do login com Google **sem entrar com ninguém** e sem alterar nada:
 *
 *     npm run google:verificar
 *
 * Serve depois de rotacionar o segredo do cliente, de mexer nos endereços de retorno no Google
 * Cloud Console ou de trocar as variáveis no Render. Faz três perguntas ao Google:
 *
 *  1. As três variáveis `GOOGLE_*` estão preenchidas e o endereço de retorno tem a forma certa?
 *  2. O Google aceita o endereço de retorno? (Abre a tela de autorização e vê se ela leva ao login
 *     ou à página de erro `redirect_uri_mismatch`, a mesma diferença que a pessoa veria.)
 *  3. O Google aceita o ID e o segredo do cliente? (Troca um código **inventado**: o Google confere
 *     o cliente antes do código, então `invalid_grant` quer dizer "credenciais aceitas, código falso"
 *     e `invalid_client` quer dizer "ID ou segredo recusados".)
 *
 * Usa as variáveis do `.env`. Para conferir valores de outro ambiente (por exemplo, o segredo novo
 * antes de colocá-lo no Render, ou o endereço de retorno de produção), defina-os só para este
 * comando, sem gravar em arquivo:
 *
 *     PowerShell:  $env:GOOGLE_CLIENT_SECRET="..."; npm run google:verificar
 *     bash:        GOOGLE_CLIENT_SECRET="..." npm run google:verificar
 *
 * O segredo nunca é impresso. Os avisos de configuração (variável faltando, endereço de retorno com
 * caminho errado...) saem sozinhos, com o prefixo [ENV], quando o `env.js` é carregado. Sai com
 * código 1 se algo for recusado.
 */
import crypto from "node:crypto";

import env from "../src/config/env.js";
import GoogleAuthService from "../src/services/GoogleAuthService.js";
import { classificarErroDaTroca, classificarPaginaDeAutorizacao } from "../src/utils/verificarGoogle.js";

const resultados = [];

const registrar = (nivel, texto) => {
    resultados.push(nivel);
    const marca = { ok: "[ok]    ", falha: "[FALHA] ", incerto: "[?]     " }[nivel];
    console.log(`${marca}${texto}`);
};

async function perguntarSobreOEnderecoDeRetorno() {
    const vinculo = crypto.randomBytes(32).toString("base64url");
    const { url } = GoogleAuthService.gerarUrlDeAutorizacao({ vinculo });

    // Segue os redirecionamentos até a página final, que é o que diz se o endereço está cadastrado.
    const resposta = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    const veredito = classificarPaginaDeAutorizacao(resposta.url);

    if (veredito === "aceito") {
        registrar("ok", `O Google aceita o endereço de retorno ${env.google.redirectUri}`);
    } else if (veredito === "recusado") {
        registrar(
            "falha",
            `O Google RECUSA o endereço de retorno ${env.google.redirectUri}. Cadastre-o, idêntico, em ` +
                "\"URIs de redirecionamento autorizados\" do cliente OAuth."
        );
    } else {
        registrar("incerto", "Não deu para saber se o Google aceita o endereço de retorno (página inesperada).");
    }
}

async function perguntarSobreAsCredenciais() {
    try {
        await GoogleAuthService.cliente().getToken({
            code: "codigo-inventado-so-para-conferir-as-credenciais",
            codeVerifier: crypto.randomBytes(32).toString("base64url")
        });
        registrar("incerto", "O Google aceitou um código inventado, o que não era esperado.");
    } catch (erro) {
        const veredito = classificarErroDaTroca(erro);

        if (veredito === "aceito") {
            registrar("ok", "O Google aceita o ID e o segredo do cliente (recusou só o código inventado, como esperado).");
        } else if (veredito === "recusado") {
            registrar(
                "falha",
                "O Google RECUSA o ID ou o segredo do cliente (invalid_client): segredo errado, trocado ou " +
                    "desativado, ou GOOGLE_CLIENT_ID de outro cliente."
            );
        } else if (veredito === "sem-resposta") {
            registrar("incerto", `Sem resposta do Google (${erro?.code ?? erro?.message ?? "erro de rede"}). Tente de novo.`);
        } else {
            registrar("incerto", `Resposta inesperada do Google: ${GoogleAuthService.motivoDoGoogle(erro)}`);
        }
    }
}

console.log("Conferindo o login com Google deste ambiente (nada é alterado e ninguém entra):\n");

if (!GoogleAuthService.disponivel()) {
    registrar("falha", "As três variáveis (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI) não estão todas preenchidas.");
} else {
    registrar("ok", "As três variáveis do Google estão preenchidas.");

    try {
        await perguntarSobreOEnderecoDeRetorno();
    } catch (erro) {
        registrar("incerto", `Não consegui abrir a tela de autorização do Google (${erro?.message ?? "erro de rede"}).`);
    }

    await perguntarSobreAsCredenciais();
}

const falhou = resultados.includes("falha");
console.log(
    falhou
        ? "\nHá o que corrigir acima."
        : "\nNada foi recusado. A volta completa só se prova entrando de verdade com uma conta Google."
);

process.exit(falhou ? 1 : 0);
