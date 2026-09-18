import { Candidato, Empresa } from "../models/index.js";
import ErroApi from "./ErroApi.js";

/**
 * Helpers de autorização por propriedade do recurso.
 *
 * RBAC sozinho não impede que um candidato edite o perfil de outro
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
        throw ErroApi.naoEncontrado("Perfil de candidato não encontrado.");
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
        throw ErroApi.naoEncontrado("Perfil de empresa não encontrado.");
    }

    return empresa;
};

/**
 * Garante que o usuário é dono do recurso ou administrador. `mensagemCustomizada` é opcional, para
 * casos que precisam de uma mensagem mais específica do recurso (como "suas próprias
 * candidaturas").
 */
export const garantirDono = (usuario, donoUsuarioId, mensagemCustomizada) => {
    if (ehAdministrador(usuario)) {
        return;
    }

    if (String(donoUsuarioId) !== String(usuario.id)) {
        throw ErroApi.acessoNegado(
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
 * Centralizado aqui (não em cada service administrativo) para que qualquer rota que
 * chegue a um usuário-alvo (passando por /admin/* ou não) aplique
 * exatamente a mesma regra, sem duplicar a checagem em cada service de
 * domínio e sem criar dependência de um service para outro.
 */
export const garantirAlvoDeAcaoAdministrativa = (
    usuarioAlvo,
    solicitante,
    { mensagemAutoAcao, mensagemAdminProtegido }
) => {
    if (String(usuarioAlvo.id) === String(solicitante.id)) {
        throw ErroApi.requisicaoInvalida(mensagemAutoAcao);
    }

    if (usuarioAlvo.tipoUsuario === "administrador") {
        throw ErroApi.acessoNegado(mensagemAdminProtegido);
    }
};

/**
 * Garante que a empresa tem cadastro aprovado antes de liberar recursos empresariais (publicar e
 * gerenciar vagas, ver candidaturas, editar o perfil). Administradores sempre passam, porque usam
 * essas rotas para moderação. `statusAprovacao` pode ser `pendente`, `aprovada`,
 * `reprovada`, `suspensa`).
 *
 * A mensagem muda por estado: suspensa (moderação depois de aprovada) tem causa diferente de
 * pendente (análise inicial), e a mesma frase para as duas confundiria a empresa sobre o que
 * aconteceu.
 */
export const garantirEmpresaAprovada = (empresa, solicitante) => {
    if (ehAdministrador(solicitante)) {
        return;
    }

    if (empresa.statusAprovacao === "aprovada") {
        return;
    }

    if (empresa.statusAprovacao === "suspensa") {
        throw ErroApi.acessoNegado(
            empresa.motivoSuspensao
                ? `Sua empresa está suspensa pela moderação do ACESSO. Motivo: ${empresa.motivoSuspensao}`
                : "Sua empresa está suspensa pela moderação do ACESSO."
        );
    }

    if (empresa.statusAprovacao === "reprovada") {
        throw ErroApi.acessoNegado(
            empresa.motivoReprovacao
                ? `Seu cadastro empresarial não foi aprovado. Motivo: ${empresa.motivoReprovacao}`
                : "Seu cadastro empresarial não foi aprovado pela equipe do ACESSO."
        );
    }

    // pendente (ou qualquer outro valor futuro que não seja um dos acima)
    throw ErroApi.acessoNegado(
        "Sua empresa está aguardando aprovação da equipe do ACESSO. Você receberá uma notificação quando a análise for concluída."
    );
};

/**
 * Atalho para ações gerais da plataforma (feed, curtir, comentar, compartilhar, mensagens,
 * dashboard) que também precisam respeitar a aprovação da empresa, sem repetir a consulta nem a
 * regra em cada service: reaproveita `garantirEmpresaAprovada`, a mesma usada em vagas,
 * candidaturas e perfil. Nunca afeta candidato ou administrador: só verifica quando
 * `solicitante.tipoUsuario === "empresa"`. Se a conta é de empresa mas o registro em `empresas`
 * ainda não existe (não deveria acontecer, porque o cadastro cria os dois na mesma transação), não
 * bloqueia: sem empresa, não há status para negar.
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
 * terceiro (candidato), nunca pela própria empresa. Reaproveita o mesmo
 * campo `statusAprovacao` de `garantirEmpresaAprovada`, mas com mensagem
 * genérica: o motivo da suspensão/reprovação é informação de moderação
 * entre o ACESSO e a empresa, não algo a expor para quem só está tentando
 * se candidatar. Nunca chamar isto no lugar de `garantirEmpresaAprovada`
 * quando quem age é a própria empresa.
 */
export const garantirVagaDisponivelParaCandidatura = (empresa) => {
    if (empresa.statusAprovacao !== "aprovada") {
        throw ErroApi.acessoNegado(
            "Esta vaga não está disponível para candidaturas no momento."
        );
    }
};
