import { Candidato } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { garantirDono } from "../utils/autorizacao.js";

/**
 * Autoriza (dono do próprio `:id` ou administrador) antes de qualquer upload ir para o Storage,
 * como o `garantirEmpresaAprovadaMiddleware.js`. A regra é a mesma `garantirDono` que
 * `UsuarioService.atualizar` e `CandidatoService.atualizarCurriculo` aplicam depois; aqui ela só
 * vem antes. Sem isso, quem enviasse um arquivo para o `:id` de outro usuário receberia 403, mas o
 * arquivo já estaria criado na pasta dele no Storage.
 */

/**
 * Uso em `usuarioRoutes.js` (foto e capa de perfil): o `:id` da rota já é o `usuarioId`, então
 * `garantirDono` só compara strings, sem consulta ao banco.
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
 * tabela `candidatos`, não o `usuarioId` diretamente; resolve o
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
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        garantirDono(req.user, candidato.usuarioId);

        return next();
    } catch (erro) {
        return next(erro);
    }
};
