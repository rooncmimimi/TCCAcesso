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
 *
 * `mensagemCustomizada` é opcional — todo call site existente (21, em
 * services e middlewares) continua usando a mensagem genérica padrão sem
 * precisar mudar nada. Só existe para os poucos casos em que uma mensagem
 * mais específica do recurso (ex.: "suas próprias candidaturas") já era
 * usada antes de reaproveitar esta função.
 */
export const garantirDono = (usuario, donoUsuarioId, mensagemCustomizada) => {
    if (ehAdministrador(usuario)) {
        return;
    }

    if (String(donoUsuarioId) !== String(usuario.id)) {
        throw ApiError.forbidden(
            mensagemCustomizada || "Você não possui permissão sobre este recurso."
        );
    }
};

/**
 * Garante que uma ação administrativa restritiva (bloquear, excluir,
 * desativar/reativar etc.) pode ser aplicada ao usuário-alvo: nunca
 * contra a própria conta do solicitante, nunca contra outra conta
 * administrativa.
 *
 * Centralizado aqui (não em cada service administrativo) para que QUALQUER rota que
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
 * `statusAprovacao` já existe no schema (`pendente`/`aprovada`/`reprovada`/
 * `suspensa`, migration 0022); este helper só passa a dar EFEITO a esse
 * campo, sem alterar o schema. Mensagem específica por estado (Fase 9):
 * "suspensa" tem causa e tratamento diferentes de "pendente" (moderação
 * ativa depois de já aprovada, não uma análise inicial em andamento) —
 * usar a mesma frase genérica de antes ("aguardando aprovação") para os
 * dois casos confundia o dono da empresa sobre o que de fato aconteceu.
 */
export const garantirEmpresaAprovada = (empresa, solicitante) => {
    if (ehAdministrador(solicitante)) {
        return;
    }

    if (empresa.statusAprovacao === "aprovada") {
        return;
    }

    if (empresa.statusAprovacao === "suspensa") {
        throw ApiError.forbidden(
            empresa.motivoSuspensao
                ? `Sua empresa está suspensa pela moderação do ACESSO. Motivo: ${empresa.motivoSuspensao}`
                : "Sua empresa está suspensa pela moderação do ACESSO."
        );
    }

    if (empresa.statusAprovacao === "reprovada") {
        throw ApiError.forbidden(
            empresa.motivoReprovacao
                ? `Seu cadastro empresarial não foi aprovado. Motivo: ${empresa.motivoReprovacao}`
                : "Seu cadastro empresarial não foi aprovado pela equipe do ACESSO."
        );
    }

    // pendente (ou qualquer outro valor futuro que não seja um dos acima)
    throw ApiError.forbidden(
        "Sua empresa está aguardando aprovação da equipe do ACESSO. Você receberá uma notificação quando a análise for concluída."
    );
};

/**
 * Atalho para ações genéricas da plataforma (feed, curtir, comentar,
 * compartilhar, mensagens, dashboard) que também precisam respeitar a
 * aprovação da empresa, sem duplicar a consulta nem a regra em cada
 * service — reaproveita `garantirEmpresaAprovada` (mesma autoridade usada
 * em vagas/candidaturas/perfil). Nunca afeta candidato/administrador: só
 * verifica quando `solicitante.tipoUsuario === "empresa"`. Se a conta é do
 * tipo empresa mas o registro `empresas` ainda não existe (não deveria
 * acontecer — cadastro cria os dois na mesma transação — mas defensivo),
 * não bloqueia: sem empresa, não há status para negar.
 */
export const garantirEmpresaAprovadaSeForEmpresa = async (solicitante) => {
    if (!solicitante || solicitante.tipoUsuario !== "empresa") {
        return;
    }

    const empresa = await Empresa.findOne({
        where: { usuarioId: solicitante.id }
    });

    if (empresa) {
        garantirEmpresaAprovada(empresa, solicitante);
    }
};

/**
 * Vaga cuja empresa não está aprovada, vista pela perspectiva de um
 * TERCEIRO (candidato) — nunca pela própria empresa. Reaproveita o mesmo
 * campo `statusAprovacao` de `garantirEmpresaAprovada`, mas com mensagem
 * genérica: o motivo da suspensão/reprovação é informação de moderação
 * entre o ACESSO e a empresa, não algo a expor para quem só está tentando
 * se candidatar. Nunca chamar isto no lugar de `garantirEmpresaAprovada`
 * quando quem age é a própria empresa.
 */
export const garantirVagaDisponivelParaCandidatura = (empresa) => {
    if (empresa.statusAprovacao !== "aprovada") {
        throw ApiError.forbidden(
            "Esta vaga não está disponível para candidaturas no momento."
        );
    }
};
