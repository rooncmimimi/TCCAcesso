import { Candidato, Empresa } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

/**
 * Helpers de autorização por propriedade do recurso.
 *
 * RBAC sozinho não impede que um candidato edite o perfil de OUTRO
 * candidato (IDOR / OWASP A01). Estes helpers resolvem o perfil do
 * usuário autenticado e permitem validar a posse do recurso nos Services.
 */

export const ehAdministrador = (usuario) => {
    return usuario?.tipoUsuario === "administrador";
};

/**
 * Retorna o registro `candidatos` do usuário autenticado.
 */
export const obterCandidatoDoUsuario = async (usuario, transaction = null) => {
    const candidato = await Candidato.findOne({
        where: { usuarioId: usuario.id },
        transaction
    });

    if (!candidato) {
        throw ApiError.notFound("Perfil de candidato não encontrado.");
    }

    return candidato;
};

/**
 * Retorna o registro `empresas` do usuário autenticado.
 */
export const obterEmpresaDoUsuario = async (usuario, transaction = null) => {
    const empresa = await Empresa.findOne({
        where: { usuarioId: usuario.id },
        transaction
    });

    if (!empresa) {
        throw ApiError.notFound("Perfil de empresa não encontrado.");
    }

    return empresa;
};

/**
 * Garante que o usuário é dono do recurso ou administrador.
 */
export const garantirDono = (usuario, donoUsuarioId) => {
    if (ehAdministrador(usuario)) {
        return;
    }

    if (String(donoUsuarioId) !== String(usuario.id)) {
        throw ApiError.forbidden(
            "Você não possui permissão sobre este recurso."
        );
    }
};
