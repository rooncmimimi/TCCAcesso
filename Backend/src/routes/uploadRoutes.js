import { Router } from "express";

import UploadController from "../controllers/UploadController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
    uploadImagem,
    uploadDocumento,
    uploadAnexos
} from "../middlewares/uploadMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.post("/imagem", uploadImagem.single("arquivo"), UploadController.imagem);

router.post(
    "/documento",
    uploadDocumento.single("arquivo"),
    UploadController.documento
);

router.post(
    "/anexos",
    uploadAnexos.array("arquivos", 4),
    UploadController.anexos
);

export default router;
