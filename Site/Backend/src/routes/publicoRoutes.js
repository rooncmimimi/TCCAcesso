import { Router } from "express";

import PublicoService from "../services/PublicoService.js";

const router = Router();

router.get("/home", async (req, res, next) => {
    try {
        const dados = await PublicoService.paginaInicial();
        return res.status(200).json({ sucesso: true, ...dados });
    } catch (erro) {
        // Log estruturado já feito pelo erroMiddleware ao receber next(erro).
        return next(erro);
    }
});

router.get("/vagas", async (req, res, next) => {
    try {
        const vagas = await PublicoService.vagasPublicas(req.query);
        return res.status(200).json({ sucesso: true, vagas });
    } catch (erro) {
        return next(erro);
    }
});

export default router;
