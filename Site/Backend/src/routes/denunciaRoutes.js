import { Router } from "express";

import DenunciaController from "../controllers/DenunciaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { denunciaLimiter } from "../middlewares/rateLimitMiddleware.js";
import { validarCriacaoDenuncia } from "../validators/denunciaValidator.js";

const router = Router();

router.post(
    "/",
    authMiddleware,
    denunciaLimiter,
    validarCriacaoDenuncia,
    validationMiddleware,
    DenunciaController.criar
);

export default router;
