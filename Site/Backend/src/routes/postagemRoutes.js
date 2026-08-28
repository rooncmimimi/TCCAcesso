import { Router } from "express";
import PostagemController from "../controllers/PostagemController.js";
import ComentarioController from "../controllers/ComentarioController.js";
import CurtidaController from "../controllers/CurtidaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { uploadAnexos, criarProcessadorArmazenamento } from "../middlewares/uploadMiddleware.js";

// Anexos de postagem vão para `postagens/<usuarioId>/<uuid>.ext`. O
// postagemId ainda não existe neste ponto (a postagem é criada depois,
// na mesma requisição), então agrupamos por autor.
const processarAnexosPostagem = criarProcessadorArmazenamento({
    pasta: (req) => `postagens/${req.user.id}`
});
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarCriacaoPostagem,
    validarAtualizacaoPostagem,
    validarDescricaoAnexo
} from "../validators/postagemValidator.js";
import { validarCriacaoComentario } from "../validators/comentarioValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", PostagemController.index);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    PostagemController.show
);

router.post(
    "/",
    uploadAnexos.array("arquivos", 4),
    processarAnexosPostagem,
    validarCriacaoPostagem,
    validationMiddleware,
    PostagemController.store
);

router.put(
    "/:id",
    validarAtualizacaoPostagem,
    validationMiddleware,
    PostagemController.update
);

router.delete(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    PostagemController.destroy
);

// Edita só a descrição acessível de um anexo já publicado — nunca o
// arquivo em si. Reaproveita a mesma autorização de dono de `update`.
router.patch(
    "/:id/anexos/:anexoId",
    validarUuidParam("id"),
    validarUuidParam("anexoId"),
    validarDescricaoAnexo,
    validationMiddleware,
    PostagemController.atualizarDescricaoAnexo
);

/* ---------- Comentários ---------- */
router.get(
    "/:postagemId/comentarios",
    validarUuidParam("postagemId"),
    validationMiddleware,
    ComentarioController.index
);

router.post(
    "/:postagemId/comentarios",
    validarCriacaoComentario,
    validationMiddleware,
    ComentarioController.store
);

/* ---------- Curtidas ---------- */
router.get(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validationMiddleware,
    CurtidaController.index
);

router.post(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validationMiddleware,
    CurtidaController.toggle
);

export default router;
