import { Router } from "express";

import ContatoController from "../controllers/ContatoController.js";
import { limiteContato } from "../middlewares/limiteRequisicoesMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarContato } from "../validators/contatoValidator.js";

const router = Router();

// Público de propósito: quem não consegue entrar na conta também precisa conseguir falar com a equipe.
router.post("/", limiteContato, validarContato, validacaoMiddleware, ContatoController.enviar);

export default router;
