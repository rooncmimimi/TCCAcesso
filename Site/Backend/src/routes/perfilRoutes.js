import { Router } from "express";
import PerfilCandidatoController from "../controllers/PerfilCandidatoController.js";
import UsuarioController from "../controllers/UsuarioController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import {
    validarRecurso,
    validarIdRecurso,
    validarCorpoPerfil
} from "../validators/perfilValidator.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

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

/**
 * Dados públicos mínimos de QUALQUER usuário (candidato, empresa ou
 * administrador) — usado como último fallback pela rota de perfil no
 * front quando o alvo não tem registro em Candidato nem Empresa (hoje,
 * isso só acontece com administradores). Nunca retorna e-mail/telefone/
 * documentos — só o necessário para montar o cabeçalho do perfil.
 */
router.get(
    "/usuario/:usuarioId",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    UsuarioController.perfilPublico
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
