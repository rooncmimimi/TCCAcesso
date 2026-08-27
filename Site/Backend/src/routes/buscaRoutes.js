import { Router } from "express";

import BuscaController from "../controllers/BuscaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", authMiddleware, BuscaController.index);

export default router;
