import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";

import env from "./config/env.js";
import routes from "./routes/index.js";
import erroMiddleware from "./middlewares/erroMiddleware.js";
import idiomaMiddleware, { contextoDeIdioma } from "./middlewares/idiomaMiddleware.js";
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

/* Idioma da requisição (pt, en, es) e tradução das mensagens da resposta; antes do CORS e dos
   parsers para que até a recusa deles já saia no idioma certo. */
app.use(idiomaMiddleware);

app.use(
    cors({
        origin(origin, callback) {
            // Permite ferramentas sem Origin (curl, Postman) e origens allowlisted.
            if (!origin || env.security.corsOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Origem não permitida pelo CORS."));
        },
        credentials: true
    })
);

/* Parsers */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* Contexto de idioma para os services (e-mails, notificações): depois dos parsers, ver o middleware */
app.use(contextoDeIdioma);

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
