import { Router } from "express";
import PerfilCandidatoController from "../controllers/PerfilCandidatoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import {
    validarRecurso,
    validarIdRecurso,
    validarCorpoPerfil
} from "../validators/perfilValidator.js";

/**
 * Perfil profissional do candidato.
 * `:recurso` = experiencias | formacoes | certificados | habilidades
 */
const router = Router();

router.use(authMiddleware);

router.get(
    "/candidatos/usuario/:usuarioId",
    PerfilCandidatoController.perfilCompletoPorUsuario
);

router.get(
    "/candidatos/:candidatoId",
    PerfilCandidatoController.perfilCompleto
);

router.get(
    "/:recurso",
    rbacMiddleware("candidato"),
    validarRecurso,
    validationMiddleware,
    PerfilCandidatoController.index
);

router.post(
    "/:recurso",
    rbacMiddleware("candidato"),
    validarRecurso,
    validarCorpoPerfil,
    validationMiddleware,
    PerfilCandidatoController.store
);

router.put(
    "/:recurso/:id",
    rbacMiddleware("candidato", "administrador"),
    validarIdRecurso,
    validarCorpoPerfil,
    validationMiddleware,
    PerfilCandidatoController.update
);

router.delete(
    "/:recurso/:id",
    rbacMiddleware("candidato", "administrador"),
    validarIdRecurso,
    validationMiddleware,
    PerfilCandidatoController.destroy
);

export default router;
