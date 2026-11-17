/**
 * Confere a tradução de conteúdo (DeepL) **sem publicar nada**:
 *
 *     npm run traducao:verificar
 *     npm run traducao:verificar -- "Boa tarde, tudo bem?"
 *
 * Responde, em ordem, as perguntas que costumam ser a causa de "o botão Traduzir não funciona":
 *
 *  1. A `DEEPL_API_KEY` está preenchida? (A chave nunca é impressa.)
 *  2. Qual endereço a chave manda usar? Chave gratuita termina em ":fx" e fala com
 *     api-free.deepl.com; chave paga fala com api.deepl.com. Trocar os dois devolve 403 com uma
 *     chave perfeitamente válida, e é o erro mais comum de configuração.
 *  3. A DeepL aceita a chave, e quanto da cota do mês já foi gasto? (`GET /v2/usage`.)
 *  4. Quanto o ACESSO já gastou neste mês pela conta do próprio cache, e quanto falta para o teto
 *     de `DEEPL_ORCAMENTO_MENSAL`. (Precisa do banco; sem banco, este passo é pulado.)
 *
 * Com um texto no fim da linha, traduz de verdade para inglês e espanhol e imprime o resultado —
 * gastando os caracteres desse texto, e só eles.
 *
 * Para testar uma chave sem gravá-la em arquivo:
 *
 *     PowerShell:  $env:DEEPL_API_KEY="..."; npm run traducao:verificar
 *     bash:        DEEPL_API_KEY="..." npm run traducao:verificar
 *
 * Sai com código 1 se a tradução não estiver utilizável.
 */
import env from "../src/config/env.js";
import DeepLService from "../src/services/DeepLService.js";

const ok = (texto) => console.log(`  ok    ${texto}`);
const falha = (texto) => console.log(`  FALHA ${texto}`);
const aviso = (texto) => console.log(`  aviso ${texto}`);

const numero = (n) => n.toLocaleString("pt-BR");

async function principal() {
    const texto = process.argv.slice(2).join(" ").trim();

    console.log("\nTradução de conteúdo (DeepL)\n");

    // 1. A chave existe?
    if (!DeepLService.disponivel()) {
        falha("DEEPL_API_KEY não está configurada.");
        console.log("\n  O Site continua funcionando: a rota /traducoes responde 503 e o botão");
        console.log("  \"Traduzir\" cai para o serviço gratuito de reserva (MyMemory).");
        console.log("  Para ligar a DeepL, pegue uma chave em https://www.deepl.com/pro-api e");
        console.log("  preencha DEEPL_API_KEY.\n");

        return 1;
    }

    ok("DEEPL_API_KEY preenchida.");

    // 2. Qual endereço essa chave usa?
    const gratuita = env.deepl.apiKey.endsWith(":fx");

    if (env.deepl.endpoint) {
        aviso(`DEEPL_ENDPOINT está apontando para ${DeepLService.baseUrl()} (só para teste; vazio em produção).`);
    } else {
        ok(`Chave da camada ${gratuita ? "GRATUITA" : "paga"} → ${DeepLService.baseUrl()}`);
    }

    // 3. A DeepL aceita a chave?
    let uso;

    try {
        uso = await DeepLService.uso();
    } catch (erro) {
        falha(`a DeepL recusou: ${erro.message}`);

        if (/recusada/i.test(erro.message)) {
            console.log("\n  403 quase sempre é endereço errado para o tipo de chave, e não chave inválida.");
            console.log(`  Esta chave ${gratuita ? "é gratuita (:fx) e precisa de api-free.deepl.com" : "é paga e precisa de api.deepl.com"}.\n`);
        }

        return 1;
    }

    const restante = uso.limite - uso.usados;

    ok(`cota do mês: ${numero(uso.usados)} de ${numero(uso.limite)} caracteres usados (${numero(restante)} restantes).`);

    if (uso.limite > 0 && restante <= 0) aviso("a cota deste mês acabou: a DeepL vai recusar até o dia 1.");

    // 4. O que o cache diz (precisa do banco).
    try {
        const { default: TraducaoService } = await import("../src/services/TraducaoService.js");
        const usadoNoMes = await TraducaoService.usadoNoMes();
        const teto = env.deepl.orcamentoMensal;

        ok(`pelo cache do ACESSO, ${numero(usadoNoMes)} caracteres novos foram traduzidos neste mês.`);

        if (teto) {
            const folga = teto - usadoNoMes;

            if (folga > 0) ok(`teto próprio (DEEPL_ORCAMENTO_MENSAL): ${numero(teto)}; ainda cabem ${numero(folga)}.`);
            else aviso(`teto próprio de ${numero(teto)} atingido: a rota vai recusar e o Site usa a reserva.`);
        } else {
            aviso("DEEPL_ORCAMENTO_MENSAL está em 0: nada segura o consumo antes da própria DeepL.");
        }
    } catch (erro) {
        aviso(`não deu para consultar o cache no banco (${erro.message}). O resto acima vale do mesmo jeito.`);
    }

    // 5. Traduzir de verdade, só se pedirem.
    if (!texto) {
        console.log("\n  Para traduzir um texto de verdade (gasta a cota só dele):");
        console.log('    npm run traducao:verificar -- "Boa tarde, tudo bem?"\n');

        return 0;
    }

    console.log(`\n  Traduzindo: "${texto}"\n`);

    for (const destino of ["en", "es"]) {
        try {
            const [saida] = await DeepLService.traduzir({ textos: [texto], origem: "pt", destino });

            ok(`pt → ${destino}: "${saida}"`);
        } catch (erro) {
            falha(`pt → ${destino}: ${erro.message}`);

            return 1;
        }
    }

    console.log("");

    return 0;
}

principal()
    .then((codigo) => process.exit(codigo))
    .catch((erro) => {
        console.error("\n  FALHA inesperada:", erro?.message ?? erro, "\n");
        process.exit(1);
    });
