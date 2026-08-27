import { Router } from "express";
import DashboardController from "../controllers/DashboardController.js";
import InteracaoController from "../controllers/InteracaoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get(
    "/admin",
    rbacMiddleware("administrador"),
    DashboardController.admin
);

router.get(
    "/empresa",
    rbacMiddleware("empresa"),
    DashboardController.empresa
);

router.get(
    "/candidato",
    rbacMiddleware("candidato"),
    DashboardController.candidato
);

// Vagas favoritadas pelo candidato autenticado.
router.get(
    "/favoritos",
    rbacMiddleware("candidato"),
    InteracaoController.listarFavoritos
);

export default router;
