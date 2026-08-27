import { Router } from "express";

import UploadController from "../controllers/UploadController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
    uploadImagem,
    uploadDocumento,
    uploadAnexos,
    processarArmazenamento,
    criarProcessadorArmazenamento
} from "../middlewares/uploadMiddleware.js";

const router = Router();

router.use(authMiddleware);

// Documento genérico (ex.: certificado) é sempre privado — nunca reaproveita
// o bucket público, independente da `categoria` enviada pelo cliente.
const processarDocumentoPrivado = criarProcessadorArmazenamento({
    pasta: (req) => `documentos/${req.user.id}`,
    privado: true
});

router.post(
    "/imagem",
    uploadImagem.single("arquivo"),
    processarArmazenamento,
    UploadController.imagem
);

router.post(
    "/documento",
    uploadDocumento.single("arquivo"),
    processarDocumentoPrivado,
    UploadController.documento
);

router.post(
    "/anexos",
    uploadAnexos.array("arquivos", 4),
    processarArmazenamento,
    UploadController.anexos
);

export default router;
