import { Router } from "express";

import UploadController from "../controllers/UploadController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
    uploadImagem,
    uploadDocumento,
    uploadAnexos,
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

// Correção (auditoria de segurança, achado A3): `/imagem` e `/anexos`
// gravavam na raiz do bucket público, sem nenhum vínculo a um recurso do
// usuário (`criarProcessadorArmazenamento({})`, sem `pasta`) — corrigido
// para escopar por usuário, mesmo padrão de `processarDocumentoPrivado`
// acima. Não removidas: `Site/Frontend/src/services/uploads.service.ts`
// (`uploadsService.enviarImagem`/`enviarAnexos`) as consome de verdade —
// nenhuma tela usa esse serviço hoje, mas ele existe, está corretamente
// tipado e apontado para estas rotas, então não é código morto (uma
// varredura inicial por "upload/imagem" não achou esse consumidor por um
// erro de digitação — o prefixo real da rota é "/uploads", no plural).
const processarUploadGenerico = criarProcessadorArmazenamento({
    pasta: (req) => `uploads/${req.user.id}`
});

router.post(
    "/imagem",
    uploadImagem.single("arquivo"),
    processarUploadGenerico,
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
    processarUploadGenerico,
    UploadController.anexos
);

export default router;
