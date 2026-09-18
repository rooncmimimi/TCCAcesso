import fs from "node:fs";
import path from "node:path";

import env from "../config/env.js";
import { storageHabilitado, removerArquivo } from "../utils/supabaseStorage.js";

/**
 * Remoção de arquivos já enviados. O envio em si acontece no `uploadMiddleware.js`, sempre ligado a
 * uma entidade (foto e capa de perfil, logo e capa de empresa, currículo ou anexo de publicação).
 */
class ArmazenamentoService {
    /**
     * Remove fisicamente um arquivo a partir da referência salva no banco (caminho do Storage ou
     * `/uploads/...` do disco local, usado quando o Supabase não está configurado).
     *
     * `privado` precisa vir de quem chama (currículo e anexo de publicação são privados; foto, capa
     * e logo não), porque o caminho sozinho não diz em qual bucket o arquivo está. Nunca aceita
     * caminho vindo do cliente sem normalizar (path traversal).
     */
    async removerArquivoFisico(caminho, { privado = false } = {}) {
        if (!caminho) {
            return false;
        }

        if (/^https?:\/\//i.test(caminho)) {
            // URL completa: só com ela não dá para remover do Storage com segurança, então não
            // tenta, para não apagar o arquivo errado.
            return false;
        }

        if (storageHabilitado && !caminho.startsWith("/uploads/")) {
            return removerArquivo(caminho, { privado });
        }

        if (!caminho.startsWith("/uploads/")) {
            return false;
        }

        const base = path.resolve(process.cwd(), env.security.uploadDir);
        const alvo = path.resolve(base, path.basename(caminho));

        if (!alvo.startsWith(base)) {
            return false;
        }

        try {
            await fs.promises.unlink(alvo);
            return true;
        } catch {
            return false;
        }
    }
}

export default new ArmazenamentoService();
