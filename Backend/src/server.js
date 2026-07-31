import app from "./app.js";
import env from "./config/env.js";
import conectarBanco from "./config/sequelize.js";

/**
 * Bootstrap do servidor com desligamento gracioso.
 */
async function iniciarServidor() {
    await conectarBanco();

    const server = app.listen(env.port, () => {
        console.log(
            `[HTTP] Servidor ACESSO rodando em http://localhost:${env.port}/api (${env.nodeEnv})`
        );
    });

    const encerrar = (sinal) => () => {
        console.log(`[HTTP] Recebido ${sinal}. Encerrando servidor...`);

        server.close(() => process.exit(0));
    };

    process.on("SIGTERM", encerrar("SIGTERM"));
    process.on("SIGINT", encerrar("SIGINT"));

    process.on("unhandledRejection", (motivo) => {
        console.error("[FATAL] Promise rejeitada sem tratamento:", motivo);
    });
}

iniciarServidor();
