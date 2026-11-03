/**
 * Reinício de emergência do TOTP de um administrador que perdeu o aplicativo E os códigos de
 * recuperação. É o caminho principal enquanto existe um administrador só (não há outro para pedir).
 *
 *     npm run admin:resetar-totp -- pessoa@exemplo.com
 *     npm run admin:resetar-totp -- pessoa@exemplo.com --motivo "Perdeu o celular e os códigos"
 *
 * Só roda por quem tem acesso ao servidor (o Shell do Render, ou uma máquina com o `.env` do banco).
 * **Não existe rota HTTP para isto** e um pedido por e-mail nunca desliga a proteção. O e-mail informado
 * só identifica a conta; a autorização é o acesso ao servidor.
 *
 * O que acontece, tudo numa transação (se algo falhar, nada muda):
 *   1. confere que a conta existe, está ativa, é de administrador e tem TOTP ativo;
 *   2. apaga o segredo e os códigos de recuperação;
 *   3. encerra TODAS as sessões da conta;
 *   4. grava na auditoria (`totp_reiniciado_por_script`), com o motivo, a data e quem executou. Nenhum
 *      segredo nem código aparece no registro.
 * Depois disso o administrador entra com a senha e só alcança a tela de configuração, até ativar um
 * TOTP novo. Veja `Site/docs/verificacao-em-duas-etapas.md`.
 *
 * Pede confirmação explícita: digitar o e-mail da conta de novo. Em um ambiente sem terminal, use
 * `--confirmar pessoa@exemplo.com` (o mesmo e-mail), que equivale a digitar a confirmação.
 */
import os from "node:os";
import readline from "node:readline";

import env from "../src/config/env.js";
import { emailCanonico } from "../src/utils/email.js";
import sequelize from "../src/config/bancoDeDados.js";
import { Usuario } from "../src/models/index.js";
import TotpService from "../src/services/TotpService.js";
import {
    MOTIVO_MAXIMO,
    MOTIVO_MINIMO,
    avaliarAlvo,
    confirmacaoConfere,
    motivoValido,
    origemDoScript
} from "../src/utils/reinicioTotpAdmin.js";

// Em desenvolvimento o Sequelize imprime cada SQL; aqui isso só poluiria as perguntas.
sequelize.options.logging = false;

const argumento = (nome) => {
    const indice = process.argv.indexOf(`--${nome}`);
    return indice === -1 ? undefined : process.argv[indice + 1];
};

// O e-mail vem como primeiro argumento solto (ou em --email).
const posicional = process.argv.slice(2).find((a, i, todos) => !a.startsWith("--") && !(todos[i - 1] ?? "").startsWith("--"));
const emailInformado = argumento("email") ?? posicional;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
const linhas = rl[Symbol.asyncIterator]();

async function perguntar(pergunta) {
    rl.output.write(pergunta);
    const { value, done } = await linhas.next();

    if (done) {
        throw new Error("A entrada terminou antes de todas as respostas. Nada foi alterado.");
    }

    return value;
}

function encerrar(codigo, mensagem) {
    if (mensagem) console[codigo === 0 ? "log" : "error"](mensagem);
    rl.close();
    // `sequelize.close()` pode demorar; o processo já fez tudo o que tinha de fazer.
    sequelize.close().finally(() => process.exit(codigo));
}

async function principal() {
    if (!emailInformado) {
        return encerrar(1, "Informe o e-mail do administrador: npm run admin:resetar-totp -- pessoa@exemplo.com");
    }

    const email = emailCanonico(emailInformado);

    await sequelize.authenticate();

    const usuario = await Usuario.findOne({ where: { email } });
    const totpAtivo = usuario ? await TotpService.buscarAtivo(usuario.id, { attributes: ["usuarioId"] }) : null;
    const avaliacao = avaliarAlvo(usuario, totpAtivo);

    if (!avaliacao.ok) {
        return encerrar(1, avaliacao.motivo);
    }

    console.log(`\nReinício do TOTP do administrador ${usuario.email}${usuario.nome ? ` (${usuario.nome})` : ""}.`);
    console.log("Isto vai apagar o segredo e os códigos de recuperação, encerrar TODAS as sessões da conta e");
    console.log("obrigar a configurar o TOTP de novo antes de qualquer função administrativa.\n");

    let motivo = argumento("motivo");

    if (!motivo) {
        motivo = await perguntar(`Motivo (${MOTIVO_MINIMO} a ${MOTIVO_MAXIMO} caracteres, fica na auditoria): `);
    }

    if (!motivoValido(motivo)) {
        return encerrar(1, `Motivo inválido: use de ${MOTIVO_MINIMO} a ${MOTIVO_MAXIMO} caracteres. Nada foi alterado.`);
    }

    const confirmacao = argumento("confirmar") ?? (await perguntar(`Para confirmar, digite o e-mail da conta (${usuario.email}): `));

    if (!confirmacaoConfere(confirmacao, usuario.email)) {
        return encerrar(1, "A confirmação não confere com o e-mail da conta. Nada foi alterado.");
    }

    const origem = origemDoScript({ usuarioDoSistema: os.userInfo().username, maquina: os.hostname() });

    await TotpService.reiniciar(usuario.id, {
        origem: "script",
        motivo: motivo.trim(),
        contexto: origem
    });

    console.log("\nPronto. O TOTP foi reiniciado e as sessões da conta foram encerradas.");
    console.log("Como confirmar:");
    console.log("  1. O administrador entra com a senha (ou o Google): o painel NÃO abre, só a tela de configuração.");
    console.log("  2. Ele escaneia o QR code, digita o código e guarda os novos códigos de recuperação.");
    console.log("  3. No painel, em Auditoria, aparece a ação totp_reiniciado_por_script com o motivo e a data.");

    return encerrar(0);
}

principal().catch((erro) => {
    const tabelaAusente = /autenticacao_totp|codigos_recuperacao_totp/.test(String(erro?.message)) && /does not exist|não existe/i.test(String(erro?.message));

    if (tabelaAusente) {
        return encerrar(1, "As tabelas do TOTP não existem neste banco: a migration 0008 não foi aplicada (npm run migrate). Nada foi alterado.");
    }

    return encerrar(1, `Falhou, e nada foi alterado: ${erro.message}${env.isProducao ? "" : `\n${erro.stack}`}`);
});
