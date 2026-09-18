import { Router } from "express";
import DashboardController from "../controllers/DashboardController.js";
import InteracaoController from "../controllers/InteracaoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get(
    "/admin",
    exigirTipoUsuarioMiddleware("administrador"),
    DashboardController.administrador
);

router.get(
    "/empresa",
    exigirTipoUsuarioMiddleware("empresa"),
    DashboardController.empresa
);

router.get(
    "/candidato",
    exigirTipoUsuarioMiddleware("candidato"),
    DashboardController.candidato
);

// Vagas favoritadas pelo candidato autenticado.
router.get(
    "/favoritos",
    exigirTipoUsuarioMiddleware("candidato"),
    InteracaoController.listarFavoritos
);

export default router;
