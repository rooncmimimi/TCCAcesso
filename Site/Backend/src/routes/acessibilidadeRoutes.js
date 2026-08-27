import { Router } from "express";
import AcessibilidadeController from "../controllers/AcessibilidadeController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarPreferencias } from "../validators/acessibilidadeValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", AcessibilidadeController.show);

router.put(
    "/",
    validarPreferencias,
    validationMiddleware,
    AcessibilidadeController.update
);

router.post("/reset", AcessibilidadeController.reset);

export default router;
