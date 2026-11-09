/**
 * Confere a sugestão de descrição de imagem por IA (OpenRouter) **sem publicar nada**:
 *
 *     npm run descricao:verificar
 *     npm run descricao:verificar -- caminho/da/imagem.png
 *
 * Sem imagem, faz só as perguntas que não custam nada:
 *
 *  1. A `OPENROUTER_API_KEY` está preenchida? (A chave nunca é impressa.)
 *  2. A OpenRouter aceita a chave, e quantos pedidos a modelos gratuitos ainda cabem hoje?
 *     (`GET /api/v1/key` → `free_model_daily_requests`. Modelo gratuito tem teto por minuto e por
 *     dia conforme os créditos já comprados na conta.)
 *  3. Cada modelo de `OPENROUTER_MODEL` existe, aceita imagem e é mesmo gratuito?
 *     (`GET /api/v1/models`. Um id que não existe mais só gasta uma tentativa — foi o que
 *     aconteceu com "minimax/minimax-m3:free".)
 *
 * Com uma imagem, tenta **um modelo por vez**, na ordem da lista, e imprime o que cada um
 * respondeu ou por que não serviu. É a mesma ordem e o mesmo pedido que o Site faz, então o que
 * aparece aqui é o que a pessoa veria na tela.
 *
 * Para testar uma chave sem gravá-la em arquivo:
 *
 *     PowerShell:  $env:OPENROUTER_API_KEY="..."; npm run descricao:verificar -- imagem.png
 *     bash:        OPENROUTER_API_KEY="..." npm run descricao:verificar -- imagem.png
 *
 * Sai com código 1 se nada funcionar.
 */
import fs from "node:fs";
import path from "node:path";

import env from "../src/config/env.js";
import OpenRouterService from "../src/services/OpenRouterService.js";
import SugestaoDescricaoService from "../src/services/SugestaoDescricaoService.js";

const MIME_POR_EXTENSAO = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
};

const ok = (texto) => console.log(`  ok    ${texto}`);
const falha = (texto) => console.log(`  FALHA ${texto}`);
const aviso = (texto) => console.log(`  aviso ${texto}`);

async function buscarJson(url) {
    const resposta = await fetch(url, {
        headers: { Authorization: `Bearer ${env.openRouter.apiKey}` }
    });

    return { status: resposta.status, dados: await resposta.json().catch(() => null) };
}

/** 1. A chave está preenchida? */
function conferirChave() {
    console.log("\n[1] Chave");

    if (!SugestaoDescricaoService.disponivel()) {
        falha("OPENROUTER_API_KEY está vazia. O Site não oferece o botão \"Descrever com IA\".");
        console.log("      Pegue uma chave em https://openrouter.ai/keys e coloque no .env (local)");
        console.log("      ou nas variáveis de ambiente do Render (produção).");
        return false;
    }

    ok(`OPENROUTER_API_KEY preenchida (${env.openRouter.apiKey.length} caracteres, não impressa).`);
    return true;
}

/** 2. A OpenRouter aceita a chave? Quanto ainda cabe hoje? */
async function conferirCota() {
    console.log("\n[2] A OpenRouter aceita a chave?");

    const { status, dados } = await buscarJson("https://openrouter.ai/api/v1/key");

    if (status === 401 || status === 403) {
        falha("chave recusada (401/403). Gere outra em https://openrouter.ai/keys.");
        return false;
    }

    if (status !== 200 || !dados?.data) {
        falha(`resposta inesperada de /api/v1/key (HTTP ${status}).`);
        return false;
    }

    ok("chave aceita.");

    const diario = dados.data.free_model_daily_requests;

    if (diario && typeof diario.remaining === "number") {
        const mensagem = `modelos gratuitos: ${diario.remaining} de ${diario.limit ?? "?"} pedidos restantes hoje.`;
        diario.remaining > 0 ? ok(mensagem) : falha(mensagem);
    } else {
        aviso("a conta não informa teto diário de modelos gratuitos (pode ser conta isenta).");
    }

    return true;
}

/** 3. Os modelos configurados existem, aceitam imagem e são gratuitos? */
async function conferirModelos() {
    console.log(`\n[3] Modelos configurados (${env.openRouter.models.length})`);

    const { status, dados } = await buscarJson("https://openrouter.ai/api/v1/models");

    if (status !== 200 || !Array.isArray(dados?.data)) {
        aviso(`não foi possível listar os modelos (HTTP ${status}); seguindo sem conferir os ids.`);
        return true;
    }

    let todosServem = true;

    for (const id of env.openRouter.models) {
        const modelo = dados.data.find((m) => m.id === id);

        if (!modelo) {
            falha(`${id} — NÃO EXISTE na OpenRouter. Confira em /api/v1/models.`);
            todosServem = false;
            continue;
        }

        const entradas = modelo.architecture?.input_modalities ?? [];

        if (!entradas.includes("image")) {
            falha(`${id} — não aceita imagem (entradas: ${entradas.join(", ") || "?"}).`);
            todosServem = false;
            continue;
        }

        if (!id.endsWith(":free")) {
            aviso(`${id} — NÃO é um modelo gratuito: este pedido é cobrado.`);
        }

        if (modelo.reasoning?.mandatory) {
            aviso(`${id} — exige raciocínio; a resposta pode voltar vazia.`);
        }

        ok(`${id} — existe, aceita imagem${id.endsWith(":free") ? ", gratuito" : ""}.`);
    }

    return todosServem;
}

/** 4. O que cada modelo responde de verdade sobre esta imagem. */
async function conferirComImagem(caminho) {
    console.log(`\n[4] Pedido real, um modelo por vez — ${caminho}`);

    const extensao = path.extname(caminho).toLowerCase();
    const mimetype = MIME_POR_EXTENSAO[extensao];

    if (!mimetype) {
        falha(`extensão ${extensao || "(nenhuma)"} não é imagem aceita (PNG, JPEG ou WEBP).`);
        return false;
    }

    const imagem = fs.readFileSync(caminho);
    console.log(`      ${(imagem.length / 1024).toFixed(0)} KB, ${mimetype}`);

    if (imagem.length > env.security.maxUploadBytes) {
        falha(`a imagem passa do limite de upload (${(env.security.maxUploadBytes / 1024 / 1024).toFixed(1)} MB).`);
        return false;
    }

    const imagemUrl = `data:${mimetype};base64,${imagem.toString("base64")}`;
    let algumRespondeu = false;

    for (const modelo of env.openRouter.models) {
        const inicio = Date.now();
        const resultado = await OpenRouterService.pedirAoModelo({
            modelo,
            imagemUrl,
            prompt: "Descreva o conteúdo desta imagem em uma frase curta, em português do Brasil, sem formatação.",
            limiteMs: env.openRouter.timeoutMs
        });
        const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

        if (resultado.texto) {
            ok(`${modelo} (${segundos}s): ${resultado.texto.slice(0, 140)}`);
            algumRespondeu = true;
        } else {
            falha(`${modelo} (${segundos}s): ${resultado.motivo}${resultado.detalhe ? ` — ${resultado.detalhe}` : ""}`);
        }
    }

    if (!algumRespondeu) {
        return false;
    }

    // O caminho completo, igual ao da rota: inclui a limpeza e a recusa de resposta que não
    // descreve nada.
    console.log("\n[5] Caminho completo (igual ao do Site), nos três idiomas");

    for (const idioma of ["pt", "en", "es"]) {
        try {
            const descricao = await SugestaoDescricaoService.sugerir(imagem, mimetype, idioma);
            ok(`${idioma}: ${descricao}`);
        } catch (erro) {
            falha(`${idioma}: ${erro.message}`);
            return false;
        }
    }

    return true;
}

const caminhoDaImagem = process.argv[2];

console.log("Sugestão de descrição de imagem por IA — verificação");
console.log(`Orçamento: ${env.openRouter.timeoutMs} ms por modelo, ${env.openRouter.orcamentoMs} ms no total.`);

let tudoCerto = conferirChave();

if (tudoCerto) {
    tudoCerto = (await conferirCota()) && tudoCerto;
    tudoCerto = (await conferirModelos()) && tudoCerto;

    if (caminhoDaImagem) {
        if (!fs.existsSync(caminhoDaImagem)) {
            console.log(`\n[4] Pedido real`);
            falha(`arquivo não encontrado: ${caminhoDaImagem}`);
            tudoCerto = false;
        } else {
            tudoCerto = (await conferirComImagem(caminhoDaImagem)) && tudoCerto;
        }
    } else {
        console.log("\n[4] Pedido real: pulado.");
        console.log("      Passe uma imagem para ver o que cada modelo responde:");
        console.log("      npm run descricao:verificar -- caminho/da/imagem.png");
    }
}

console.log(tudoCerto ? "\nTudo certo." : "\nAlgo precisa de atenção (veja as linhas FALHA).");
process.exit(tudoCerto ? 0 : 1);
