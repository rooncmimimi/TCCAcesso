import { Router } from "express";
import PerfilCandidatoController from "../controllers/PerfilCandidatoController.js";
import UsuarioController from "../controllers/UsuarioController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
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

router.use(autenticacaoMiddleware);

router.get(
    "/candidatos/usuario/:usuarioId",
    PerfilCandidatoController.perfilCompletoPorUsuario
);

router.get(
    "/candidatos/:candidatoId",
    PerfilCandidatoController.perfilCompleto
);

/**
 * Dados públicos mínimos de qualquer usuário (candidato, empresa ou
 * administrador): usado como último fallback pela rota de perfil no
 * front quando o alvo não tem registro em Candidato nem Empresa (hoje,
 * isso só acontece com administradores). Nunca retorna e-mail/telefone/
 * documentos: só o necessário para montar o cabeçalho do perfil.
 */
router.get(
    "/usuario/:usuarioId",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    UsuarioController.perfilPublico
);

router.get(
    "/:recurso",
    exigirTipoUsuarioMiddleware("candidato"),
    validarRecurso,
    validacaoMiddleware,
    PerfilCandidatoController.listar
);

router.post(
    "/:recurso",
    exigirTipoUsuarioMiddleware("candidato"),
    validarRecurso,
    validarCorpoPerfil,
    validacaoMiddleware,
    PerfilCandidatoController.criar
);

router.put(
    "/:recurso/:id",
    exigirTipoUsuarioMiddleware("candidato", "administrador"),
    validarIdRecurso,
    validarCorpoPerfil,
    validacaoMiddleware,
    PerfilCandidatoController.atualizar
);

router.delete(
    "/:recurso/:id",
    exigirTipoUsuarioMiddleware("candidato", "administrador"),
    validarIdRecurso,
    validacaoMiddleware,
    PerfilCandidatoController.excluir
);

export default router;
