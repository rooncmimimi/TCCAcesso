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

/**
 * Garante que uma ação administrativa restritiva (bloquear, excluir,
 * desativar/reativar etc.) pode ser aplicada ao usuário-alvo: nunca
 * contra a própria conta do solicitante, nunca contra outra conta
 * administrativa.
 *
 * Centralizado aqui (não em AdminService) para que QUALQUER rota que
 * chegue a um usuário-alvo — passando por /admin/* ou não — aplique
 * exatamente a mesma regra, sem duplicar a checagem em cada service de
 * domínio e sem criar dependência de um service para outro.
 */
export const garantirAlvoDeAcaoAdministrativa = (
    usuarioAlvo,
    solicitante,
    { mensagemAutoAcao, mensagemAdminProtegido }
) => {
    if (String(usuarioAlvo.id) === String(solicitante.id)) {
        throw ApiError.badRequest(mensagemAutoAcao);
    }

    if (usuarioAlvo.tipoUsuario === "administrador") {
        throw ApiError.forbidden(mensagemAdminProtegido);
    }
};

/**
 * Garante que a empresa está com o cadastro aprovado antes de liberar
 * recursos empresariais (publicar/gerenciar vagas, ver candidaturas,
 * editar o perfil empresarial). Administradores sempre têm acesso —
 * eles usam essas rotas para moderação, independente do status.
 *
 * `statusAprovacao` já existe no schema (`pendente`/`aprovada`/`reprovada`);
 * este helper só passa a dar EFEITO a esse campo, sem alterar o schema.
 */
export const garantirEmpresaAprovada = (empresa, solicitante) => {
    if (ehAdministrador(solicitante)) {
        return;
    }

    if (empresa.statusAprovacao === "aprovada") {
        return;
    }

    if (empresa.statusAprovacao === "reprovada") {
        throw ApiError.forbidden(
            empresa.motivoReprovacao
                ? `Seu cadastro empresarial não foi aprovado. Motivo: ${empresa.motivoReprovacao}`
                : "Seu cadastro empresarial não foi aprovado pela equipe do ACESSO."
        );
    }

    // pendente (ou qualquer outro valor futuro que não seja "aprovada")
    throw ApiError.forbidden(
        "Sua empresa está aguardando aprovação da equipe do ACESSO. Você receberá uma notificação quando a análise for concluída."
    );
};
