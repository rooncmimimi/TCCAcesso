import { Router } from "express";
import AcessibilidadeController from "../controllers/AcessibilidadeController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarPreferencias } from "../validators/acessibilidadeValidator.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get("/", AcessibilidadeController.obter);

router.put(
    "/",
    validarPreferencias,
    validacaoMiddleware,
    AcessibilidadeController.atualizar
);

router.post("/reset", AcessibilidadeController.restaurar);

export default router;
