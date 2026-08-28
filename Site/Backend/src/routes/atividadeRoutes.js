import { Router } from "express";

import AtividadeController from "../controllers/AtividadeController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

// Sempre escopado a `req.user` (nunca recebe um id de usuário) — é o que
// garante que ninguém consegue ler a atividade de outra pessoa.
router.get("/minha", AtividadeController.minha);

export default router;
