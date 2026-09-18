import { Router } from "express";
import EmpresaController from "../controllers/EmpresaController.js";
import InteracaoController from "../controllers/InteracaoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import autenticacaoOpcionalMiddleware from "../middlewares/autenticacaoOpcionalMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import upload, { criarProcessadorArmazenamento } from "../middlewares/uploadMiddleware.js";
import garantirEmpresaAprovadaMiddleware from "../middlewares/garantirEmpresaAprovadaMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import { validarAtualizacaoEmpresa } from "../validators/empresaValidator.js";

const router = Router();

// Logo/capa vão para `empresas/<empresaId>/<uuid>.ext`.
const processarLogoCapa = criarProcessadorArmazenamento({
    pasta: (req) => `empresas/${req.params.id}`
});

/* Rotas públicas */
router.get("/", EmpresaController.listar);
router.get("/parceiras", EmpresaController.parceiras);

router.get(
    "/usuario/:usuarioId",
    autenticacaoOpcionalMiddleware,
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    EmpresaController.porUsuario
);

/* Rotas autenticadas */
router.get("/me", autenticacaoMiddleware, EmpresaController.perfilAtual);

router.get(
    "/seguindo",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("candidato"),
    InteracaoController.listarSeguidas
);

router.get(
    "/:id",
    autenticacaoOpcionalMiddleware,
    validarUuidParam("id"),
    validacaoMiddleware,
    EmpresaController.obter
);

router.put(
    "/:id",
    autenticacaoMiddleware,
    validarAtualizacaoEmpresa,
    validacaoMiddleware,
    EmpresaController.atualizar
);

router.patch(
    "/:id/logo",
    autenticacaoMiddleware,
    validarUuidParam("id"),
    validacaoMiddleware,
    garantirEmpresaAprovadaMiddleware,
    upload.single("logo"),
    processarLogoCapa,
    EmpresaController.enviarLogo
);

router.patch(
    "/:id/capa",
    autenticacaoMiddleware,
    validarUuidParam("id"),
    validacaoMiddleware,
    garantirEmpresaAprovadaMiddleware,
    upload.single("capa"),
    processarLogoCapa,
    EmpresaController.enviarCapa
);

router.delete(
    "/:id",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    EmpresaController.excluir
);

export default router;
