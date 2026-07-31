import { Router } from "express";

import CurtidaController from "../controllers/CurtidaController.js";

import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

/* ======================================================
   CURTIR / DESCURTIR
====================================================== */

router.post(

    "/:postagemId",

    authMiddleware,

    CurtidaController.toggle

);

/* ======================================================
   LISTAR CURTIDAS
====================================================== */

router.get(

    "/:postagemId",

    authMiddleware,

    CurtidaController.list

);

/* ======================================================
   TOTAL DE CURTIDAS
====================================================== */

router.get(

    "/:postagemId/total",

    authMiddleware,

    CurtidaController.count

);

/* ======================================================
   VERIFICAR SE O USUÁRIO CURTIU
====================================================== */

router.get(

    "/:postagemId/verificar",

    authMiddleware,

    CurtidaController.hasLiked

);

export default router;