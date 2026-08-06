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
import perfilRoutes from "./perfilRoutes.js";
import acessibilidadeRoutes from "./acessibilidadeRoutes.js";
import compartilhamentoRoutes from "./compartilhamentoRoutes.js";
import chatbotRoutes from "./chatbotRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import buscaRoutes from "./buscaRoutes.js";
import seguidorRoutes from "./seguidorRoutes.js";
import adminRoutes from "./adminRoutes.js";
import publicoRoutes from "./publicoRoutes.js";

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
router.use("/perfil", perfilRoutes);
router.use("/acessibilidade", acessibilidadeRoutes);
router.use("/compartilhamentos", compartilhamentoRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/uploads", uploadRoutes);
router.use("/busca", buscaRoutes);
router.use("/seguir", seguidorRoutes);
router.use("/admin", adminRoutes);
router.use("/publico", publicoRoutes);

export default router;
