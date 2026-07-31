import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";

import env from "./config/env.js";
import routes from "./routes/index.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import { apiLimiter } from "./middlewares/rateLimitMiddleware.js";
import ApiError from "./utils/ApiError.js";

const app = express();

// Necessário para o rate limit funcionar corretamente atrás de proxy.
app.set("trust proxy", 1);

/* ---------- Segurança ---------- */
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    })
);

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

/* ---------- Parsers ---------- */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

/* ---------- Logs ---------- */
app.use(morgan(env.isProducao ? "combined" : "dev"));

/* ---------- Arquivos enviados ---------- */
app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), env.security.uploadDir), {
        // Não executa nada: apenas serve estáticos com download seguro.
        dotfiles: "deny",
        index: false
    })
);

/* ---------- API ---------- */
app.use("/api", apiLimiter, routes);

/* ---------- 404 ---------- */
app.use((req, res, next) => {
    next(ApiError.notFound("Rota não encontrada."));
});

/* ---------- Erros ---------- */
app.use(errorMiddleware);

export default app;
