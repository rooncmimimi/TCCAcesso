import { Candidato } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { garantirDono } from "../utils/authorization.js";

/**
 * Autoriza (dono do próprio `:id` ou administrador) ANTES de qualquer
 * upload ir para o Storage — mesmo princípio já usado em
 * `garantirEmpresaAprovadaMiddleware.js` para logo/capa de empresa
 * (achado da auditoria do J1, corrigido ali; J1.1 fecha o mesmo problema
 * aqui, em `usuarioRoutes.js`/`candidatoRoutes.js`).
 *
 * Antes desta correção, a autorização só acontecia dentro do
 * Controller/Service (`UsuarioService.update`/`CandidatoService.
 * atualizarCurriculo`, ambos via `garantirDono` — nenhuma implementação
 * nova da regra, só adiantada pra antes do upload) — ou seja, DEPOIS que
 * `upload.single`/`criarProcessadorArmazenamento` já tinham enviado o
 * arquivo pro Supabase Storage. Um usuário autenticado enviando um
 * arquivo para o `:id` de OUTRO usuário recebia 403 corretamente (o
 * banco nunca era alterado), mas o arquivo físico já tinha sido criado
 * na pasta do outro usuário no Storage — o upload nunca deveria ter
 * acontecido.
 */

/**
 * Uso em `usuarioRoutes.js` (foto/capa de perfil): `:id` da rota já É o
 * `usuarioId` diretamente — `garantirDono` só compara strings, nenhuma
 * consulta ao banco é necessária aqui.
 */
export const garantirDonoDeUsuario = (req, res, next) => {
    try {
        garantirDono(req.user, req.params.id);
        return next();
    } catch (erro) {
        return next(erro);
    }
};

/**
 * Uso em `candidatoRoutes.js` (currículo): `:id` da rota é o PK da
 * tabela `candidatos`, não o `usuarioId` diretamente — resolve o
 * `usuarioId` dono desse registro antes de aplicar a mesma
 * `garantirDono` (idêntica à que `CandidatoService.atualizarCurriculo`
 * já usa).
 */
export const garantirDonoDeCandidato = async (req, res, next) => {
    try {
        const candidato = await Candidato.findByPk(req.params.id, {
            attributes: ["usuarioId"]
        });

        if (!candidato) {
            throw ApiError.notFound("Candidato não encontrado.");
        }

        garantirDono(req.user, candidato.usuarioId);

        return next();
    } catch (erro) {
        return next(erro);
    }
};
