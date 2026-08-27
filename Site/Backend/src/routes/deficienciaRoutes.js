import { Router } from "express";
import DeficienciaController from "../controllers/DeficienciaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import {
    validarDeficiencia,
    validarIdDeficiencia
} from "../validators/deficienciaValidator.js";

const router = Router();

/* ---------- Leitura pública (catálogo) ---------- */
router.get("/", DeficienciaController.index);

router.get(
    "/:id",
    validarIdDeficiencia,
    validationMiddleware,
    DeficienciaController.show
);

/* ---------- Escrita restrita a administradores ---------- */
router.post(
    "/",
    authMiddleware,
    rbacMiddleware("administrador"),
    validarDeficiencia,
    validationMiddleware,
    DeficienciaController.store
);

router.put(
    "/:id",
    authMiddleware,
    rbacMiddleware("administrador"),
    validarIdDeficiencia,
    validarDeficiencia,
    validationMiddleware,
    DeficienciaController.update
);

router.delete(
    "/:id",
    authMiddleware,
    rbacMiddleware("administrador"),
    validarIdDeficiencia,
    validationMiddleware,
    DeficienciaController.destroy
);

export default router;
