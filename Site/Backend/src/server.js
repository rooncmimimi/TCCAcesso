import http from "node:http";

import app from "./app.js";
import env from "./config/env.js";
import conectarBanco from "./config/sequelize.js";
import sequelize from "./config/bancoDeDados.js";
import { avisoDaMigracaoContaSemSenha, avisoDaMigracaoTotp } from "./config/avisosDeAmbiente.js";
import { iniciarSocket } from "./realtime/socket.js";
import { storageHabilitado } from "./utils/supabaseStorage.js";

/**
 * Bootstrap do servidor com desligamento gracioso.
 *
 * O Express é montado sobre um servidor HTTP explícito para que o
 * Socket.IO possa compartilhar a mesma porta (tempo real de mensagens,
 * notificações e feed).
 */
async function iniciarServidor() {
    await conectarBanco();

    // Com a criação de conta sem senha ligada, confere (sem alterar nada) se a migration 0007 foi
    // aplicada; sem ela, cada conta criada pelo Google falharia no banco.
    const avisoDaMigracao = await avisoDaMigracaoContaSemSenha({
        habilitado: env.google.contaSemSenha,
        consultar: async () => {
            const [linha] = await sequelize.query(
                "SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'senha_hash'",
                { type: "SELECT" }
            );

            return linha?.is_nullable ?? null;
        }
    });
    if (avisoDaMigracao) console.error(avisoDaMigracao);

    // Mesma conferência para o TOTP: ligado sem a migration 0008, o login e o painel falhariam no banco.
    const avisoDoTotp = await avisoDaMigracaoTotp({
        habilitado: env.mfa.habilitado,
        consultar: async () => {
            const tabelas = await sequelize.query(
                // Alias obrigatório: o Sequelize reconhece 'SELECT table_name FROM information_schema.tables' como a listagem
                // de tabelas dele e devolveria arrays em vez de linhas, e a conferência nunca acharia nada.
                "SELECT tablename AS nome FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('autenticacao_totp', 'codigos_recuperacao_totp')",
                { type: "SELECT" }
            );
            const colunas = await sequelize.query(
                "SELECT 'sessoes.' || column_name AS item FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessoes' AND column_name = 'mfa_verificado_em'",
                { type: "SELECT" }
            );

            return [...tabelas.map((linha) => linha.nome), ...colunas.map((linha) => linha.item)];
        }
    });
    if (avisoDoTotp) console.error(avisoDoTotp);

    // Nunca loga as credenciais, só o modo em uso, para deixar óbvio em
    // produção se o Storage persistente está realmente ativo ou se caiu
    // (não deveria, dado o fail-fast em env.js) no disco local efêmero.
    if (storageHabilitado) {
        console.log(
            `[STORAGE] Supabase Storage ativo (buckets: ${env.storage.publicBucket} / ${env.storage.privateBucket})`
        );
    } else {
        console.log("[STORAGE] Disco local ativo — desenvolvimento");
    }

    const server = http.createServer(app);

    const io = iniciarSocket(server);

    server.listen(env.port, () => {
        console.log(
            `[HTTP] Servidor ACESSO rodando em http://localhost:${env.port}/api (${env.nodeEnv})`
        );
        console.log("[WS] Socket.IO inicializado no mesmo servidor HTTP.");
    });

    const encerrar = (sinal) => () => {
        console.log(`[HTTP] Recebido ${sinal}. Encerrando servidor...`);

        io.close();
        server.close(() => process.exit(0));
    };

    process.on("SIGTERM", encerrar("SIGTERM"));
    process.on("SIGINT", encerrar("SIGINT"));

    process.on("unhandledRejection", (motivo) => {
        console.error("[FATAL] Promise rejeitada sem tratamento:", motivo);
    });
}

iniciarServidor();
