/**
 * Cria uma conta de administrador, ou transforma uma conta existente em administradora.
 *
 * A API não cadastra administradores (`/auth/register` só aceita candidato e empresa), então a conta
 * nasce por aqui, direto no banco que o `.env` aponta:
 *
 *     npm run criar-admin
 *     npm run criar-admin -- --email pessoa@exemplo.com --nome "Nome"
 *     npm run criar-admin -- --email pessoa@exemplo.com --promover
 *
 * `--promover` é para quando o e-mail já tem uma conta de candidato ou empresa: o perfil antigo sai
 * (com o que depende dele, como candidaturas ou vagas), a senha passa a ser a digitada aqui e as
 * sessões abertas daquela conta são encerradas. Nada disso acontece sem confirmação.
 *
 * A senha nunca vem por argumento. Ela é pedida num prompt que não mostra o que é digitado, para não
 * ficar no histórico do terminal nem em arquivo, e passa pelas mesmas regras de senha forte do cadastro.
 */
import readline from "node:readline";

import env from "../src/config/env.js";
import sequelize from "../src/config/bancoDeDados.js";
import {
    Usuario,
    Candidato,
    Candidatura,
    Empresa,
    Vaga,
    Sessao,
    TokenPush
} from "../src/models/index.js";
import { gerarHashSenha } from "../src/utils/bcrypt.js";

// Em desenvolvimento o Sequelize imprime cada SQL; aqui isso só poluiria as perguntas.
sequelize.options.logging = false;

// Mesmas regras de `regrasSenha` (validators/autenticacaoValidator.js).
const REGRAS_SENHA = [
    [(s) => s.length >= 8 && s.length <= 72, "entre 8 e 72 caracteres"],
    [(s) => /[a-z]/.test(s), "uma letra minúscula"],
    [(s) => /[A-Z]/.test(s), "uma letra maiúscula"],
    [(s) => /\d/.test(s), "um número"],
    [(s) => /[^A-Za-z0-9]/.test(s), "um caractere especial"]
];

const argumento = (nome) => {
    const indice = process.argv.indexOf(`--${nome}`);
    return indice === -1 ? undefined : process.argv[indice + 1];
};
const promover = process.argv.includes("--promover");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY)
});

// Enquanto `silencioso` estiver ligado, o que a pessoa digita não aparece na tela.
rl._writeToOutput = (texto) => {
    if (!rl.silencioso) rl.output.write(texto);
};

// Uma linha por pergunta, na ordem em que chegam: funciona igual digitando no terminal ou com a
// entrada vinda de um pipe (onde tudo chega de uma vez e `rl.question` perderia as linhas).
const linhas = rl[Symbol.asyncIterator]();

async function perguntar(pergunta, { oculto = false } = {}) {
    rl.output.write(pergunta);
    rl.silencioso = oculto;
    const { value, done } = await linhas.next();
    rl.silencioso = false;
    if (oculto) rl.output.write("\n");

    if (done) {
        throw new Error("A entrada terminou antes de todas as respostas. Nada foi alterado.");
    }

    return value;
}

const perguntarOculto = (pergunta) => perguntar(pergunta, { oculto: true });

/** O que some junto com o perfil antigo, para a confirmação dizer isso com números. */
async function descreverPerfilRemovido(usuario) {
    if (usuario.candidato) {
        const candidaturas = await Candidatura.count({ where: { candidatoId: usuario.candidato.id } });
        return `o perfil de candidato (com ${candidaturas} candidatura(s), experiências, formações e currículo)`;
    }

    if (usuario.empresa) {
        const vagas = await Vaga.count({ where: { empresaId: usuario.empresa.id } });
        return `o perfil de empresa (com ${vagas} vaga(s) e as candidaturas delas)`;
    }

    return null;
}

async function main() {
    console.log(`Banco "${env.db.name}" em ${env.db.host}.\n`);

    // O login compara o e-mail em minúsculas e sem espaços (`AutenticacaoService.normalizarEmail`).
    const email = String(argumento("email") ?? (await perguntar("E-mail: ")))
        .trim()
        .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("E-mail inválido.");
    }

    const existente = await Usuario.findOne({
        where: { email },
        include: [
            { model: Candidato, as: "candidato" },
            { model: Empresa, as: "empresa" }
        ]
    });

    if (existente?.tipoUsuario === "administrador") {
        throw new Error(`${email} já é administrador. Nada foi alterado.`);
    }

    if (existente && !promover) {
        throw new Error(
            `Já existe uma conta de ${existente.tipoUsuario} com o e-mail ${email}. ` +
                "Para transformá-la em administradora, rode de novo com --promover. Nada foi alterado."
        );
    }

    if (!existente && promover) {
        throw new Error(`Não existe conta com o e-mail ${email} para promover. Rode sem --promover para criar.`);
    }

    const nome = existente
        ? existente.nome
        : String(argumento("nome") ?? (await perguntar("Nome (Enter para \"Administrador\"): "))).trim() ||
          "Administrador";

    const senha = await perguntarOculto("Senha: ");
    const faltando = REGRAS_SENHA.filter(([regra]) => !regra(senha)).map(([, descricao]) => descricao);

    if (faltando.length > 0) {
        throw new Error(`A senha precisa ter ${faltando.join(", ")}.`);
    }

    if ((await perguntarOculto("Confirme a senha: ")) !== senha) {
        throw new Error("As senhas não coincidem.");
    }

    if (existente) {
        const removido = await descreverPerfilRemovido(existente);
        console.log(
            `\nA conta de ${existente.tipoUsuario} ${email} (${nome}) vira administradora.` +
                (removido ? ` Sai ${removido}.` : "") +
                " A senha passa a ser a que você acabou de digitar, e as sessões abertas dessa conta são encerradas."
        );
    }

    const confirmacao = await perguntar(
        existente ? "Continuar? (s/N) " : `\nCriar o administrador ${email} neste banco? (s/N) `
    );

    if (confirmacao.trim().toLowerCase() !== "s") {
        console.log("Cancelado. Nada foi alterado.");
        return;
    }

    const senhaHash = await gerarHashSenha(senha);

    const usuario = await sequelize.transaction(async (transaction) => {
        if (!existente) {
            const criado = await Usuario.create(
                {
                    nome,
                    email,
                    senhaHash,
                    tipoUsuario: "administrador",
                    // Conta criada por quem já controla o banco: não há e-mail a confirmar.
                    emailVerificado: true
                },
                { transaction }
            );

            return criado;
        }

        // O banco apaga em cascata o que depende do perfil (candidaturas, vagas, experiências...).
        await existente.candidato?.destroy({ transaction });
        await existente.empresa?.destroy({ transaction });

        await existente.update(
            {
                tipoUsuario: "administrador",
                senhaHash,
                emailVerificado: true,
                // Invalida os tokens que a conta tinha como candidato ou empresa, como numa troca de senha.
                senhaAlteradaEm: new Date()
            },
            { transaction }
        );

        await Sessao.update(
            { revogadaEm: new Date() },
            { where: { usuarioId: existente.id, revogadaEm: null }, transaction }
        );
        await TokenPush.destroy({ where: { usuarioId: existente.id }, transaction });

        return existente;
    });

    console.log(
        `\nAdministrador ${existente ? "promovido" : "criado"}: ${usuario.email} (id ${usuario.id}). Já pode entrar pelo Site.`
    );
}

try {
    await main();
} catch (erro) {
    console.error(`\n${erro.message}`);
    process.exitCode = 1;
} finally {
    rl.close();
    await sequelize.close();
}
