import { Router } from "express";

import UploadController from "../controllers/UploadController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
    uploadDocumento,
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

// Etapa 5: `/imagem` e `/anexos` (e `uploadsService.enviarImagem`/`enviarAnexos`
// no frontend) foram removidas — auditoria confirmou zero consumidor real
// (nenhuma tela chamava esse serviço; o fluxo real de postagem com anexos
// usa `POST /postagens` diretamente, ver `postagemRoutes.js`).
router.post(
    "/documento",
    uploadDocumento.single("arquivo"),
    processarDocumentoPrivado,
    UploadController.documento
);

export default router;
