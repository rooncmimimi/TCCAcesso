import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";

import env from "./config/env.js";
import { opcoesCors } from "./config/cors.js";
import routes from "./routes/index.js";
import erroMiddleware from "./middlewares/erroMiddleware.js";
import { limiteApi } from "./middlewares/limiteRequisicoesMiddleware.js";
import ErroApi from "./utils/ErroApi.js";

const app = express();

// Necessário para o rate limit funcionar corretamente atrás de proxy.
app.set("trust proxy", 1);

/* Segurança */
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    })
);

// Permite ferramentas sem Origin (curl, Postman) e origens allowlisted; recusa as demais com 403.
app.use(cors(opcoesCors));

/* Parsers */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* Logs */
app.use(morgan(env.isProducao ? "combined" : "dev"));

/* Arquivos enviados */
app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), env.security.uploadDir), {
        // Não executa nada: apenas serve estáticos com download seguro.
        dotfiles: "deny",
        index: false
    })
);

/* Health check (Render) */
app.get("/healthz", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "ACESSO API",
        environment: env.nodeEnv
    });
});

/* API */
app.use("/api", limiteApi, routes);

/* 404 */
app.use((req, res, next) => {
    next(ErroApi.naoEncontrado("Rota não encontrada."));
});

/* Erros */
app.use(erroMiddleware);

export default app;
