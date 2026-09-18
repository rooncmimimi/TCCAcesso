import { Router } from "express";
import DeficienciaController from "../controllers/DeficienciaController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import {
    validarDeficiencia,
    validarIdDeficiencia
} from "../validators/deficienciaValidator.js";

const router = Router();

/* Leitura pública (catálogo) */
router.get("/", DeficienciaController.listar);

router.get(
    "/:id",
    validarIdDeficiencia,
    validacaoMiddleware,
    DeficienciaController.obter
);

/* Escrita restrita a administradores */
router.post(
    "/",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("administrador"),
    validarDeficiencia,
    validacaoMiddleware,
    DeficienciaController.criar
);

router.put(
    "/:id",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("administrador"),
    validarIdDeficiencia,
    validarDeficiencia,
    validacaoMiddleware,
    DeficienciaController.atualizar
);

router.delete(
    "/:id",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("administrador"),
    validarIdDeficiencia,
    validacaoMiddleware,
    DeficienciaController.excluir
);

export default router;
