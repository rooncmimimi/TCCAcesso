import { Router } from "express";

import BuscaController from "../controllers/BuscaController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";

const router = Router();

router.get("/", autenticacaoMiddleware, BuscaController.listar);

export default router;
