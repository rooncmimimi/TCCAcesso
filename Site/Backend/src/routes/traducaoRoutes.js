import { Router } from "express";

import TraducaoController from "../controllers/TraducaoController.js";
import { limiteTraducao } from "../middlewares/limiteRequisicoesMiddleware.js";

const router = Router();

/**
 * Público de propósito: o feed e a página da vaga são abertos, e quem chega sem conta é justamente
 * quem mais precisa do botão "Traduzir" — alguém que achou uma vaga e não lê português.
 *
 * O que protege a cota não é o login, é o conjunto: cache no banco (texto repetido não custa nada),
 * limite por IP aqui e teto mensal no serviço.
 */
router.post("/", limiteTraducao, TraducaoController.traduzir);

export default router;
