import { Router } from "express";
import MinhaAcessibilidadeController from "../controllers/MinhaAcessibilidadeController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarAdaptacoes, validarComunicacao, validarPrivacidade } from "../validators/minhaAcessibilidadeValidator.js";

/**
 * Minha Acessibilidade. TUDO privado: exige sessão e perfil de candidato, e cada rota opera sobre
 * o candidato da própria sessão (nenhum id na URL, então não há como apontar para outra pessoa).
 */
const router = Router();

router.use(autenticacaoMiddleware);
router.use(exigirTipoUsuarioMiddleware("candidato"));

router.get("/catalogo", MinhaAcessibilidadeController.catalogo);
router.get("/", MinhaAcessibilidadeController.obter);

router.put("/adaptacoes", validarAdaptacoes, validacaoMiddleware, MinhaAcessibilidadeController.atualizarAdaptacoes);
router.put("/comunicacao", validarComunicacao, validacaoMiddleware, MinhaAcessibilidadeController.atualizarComunicacao);
router.put("/privacidade", validarPrivacidade, validacaoMiddleware, MinhaAcessibilidadeController.atualizarPrivacidade);

export default router;
