import { Router } from "express";

import DenunciaController from "../controllers/DenunciaController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { limiteDenuncia } from "../middlewares/limiteRequisicoesMiddleware.js";
import { validarCriacaoDenuncia } from "../validators/denunciaValidator.js";

const router = Router();

router.post(
    "/",
    autenticacaoMiddleware,
    limiteDenuncia,
    validarCriacaoDenuncia,
    validacaoMiddleware,
    DenunciaController.criar
);

export default router;
