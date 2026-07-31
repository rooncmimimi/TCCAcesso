import { Router } from "express";

import authRoutes from "./authRoutes.js";
import usuarioRoutes from "./usuarioRoutes.js";
import candidatoRoutes from "./candidatoRoutes.js";
import empresaRoutes from "./empresaRoutes.js";
import vagaRoutes from "./vagaRoutes.js";
import candidaturaRoutes from "./candidaturaRoutes.js";
import postagemRoutes from "./postagemRoutes.js";
import comentarioRoutes from "./comentarioRoutes.js";
import conversaRoutes from "./conversaRoutes.js";
import notificacaoRoutes from "./notificacaoRoutes.js";
import deficienciaRoutes from "./deficienciaRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
    res.status(200).json({ sucesso: true, status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/candidatos", candidatoRoutes);
router.use("/empresas", empresaRoutes);
router.use("/vagas", vagaRoutes);
router.use("/candidaturas", candidaturaRoutes);
router.use("/postagens", postagemRoutes);
router.use("/comentarios", comentarioRoutes);
router.use("/conversas", conversaRoutes);
router.use("/notificacoes", notificacaoRoutes);
router.use("/deficiencias", deficienciaRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
