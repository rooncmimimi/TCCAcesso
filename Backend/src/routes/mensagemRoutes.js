import { Router } from "express";

import MensagemController from "../controllers/MensagemController.js";

import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

/* ======================================================
   LISTAR MENSAGENS DA CONVERSA
====================================================== */

router.get(

    "/conversa/:conversaId",

    authMiddleware,

    MensagemController.list

);

/* ======================================================
   BUSCAR MENSAGEM
====================================================== */

router.get(

    "/:id",

    authMiddleware,

    MensagemController.findById

);

/* ======================================================
   ENVIAR MENSAGEM
====================================================== */

router.post(

    "/conversa/:conversaId",

    authMiddleware,

    MensagemController.create

);

/* ======================================================
   MARCAR COMO VISUALIZADA
====================================================== */

router.patch(

    "/:id/visualizada",

    authMiddleware,

    MensagemController.marcarComoVisualizada

);

/* ======================================================
   EDITAR MENSAGEM
====================================================== */

router.put(

    "/:id",

    authMiddleware,

    MensagemController.update

);

/* ======================================================
   EXCLUIR MENSAGEM
====================================================== */

router.delete(

    "/:id",

    authMiddleware,

    MensagemController.remove

);

export default router;