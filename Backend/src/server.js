import http from "node:http";

import app from "./app.js";
import env from "./config/env.js";
import conectarBanco from "./config/sequelize.js";
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

    // Nunca loga as credenciais — só o modo em uso, para deixar óbvio em
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
