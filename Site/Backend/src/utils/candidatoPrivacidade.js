import { Op } from "sequelize";
import { Candidatura, Vaga, Empresa } from "../models/index.js";
import { ehAdministrador } from "./autorizacao.js";
import BloqueioService from "../services/BloqueioService.js";

/**
 * Separação entre dados públicos e privados do candidato, contra IDOR. Fica num só lugar porque
 * várias rotas expõem o mesmo `Candidato` a terceiros (`GET /candidatos/:id`,
 * `GET /perfil/candidatos/:candidatoId` e as candidaturas).
 *
 * A estratégia é uma allowlist: um campo só aparece para terceiros se estiver nas listas abaixo, e
 * qualquer campo novo do model fica privado até alguém decidir torná-lo público.
 *
 * TRÊS níveis, e nenhum deles é "ter uma candidatura":
 *
 *  1. DADOS PRIVADOS (CPF, endereço, nascimento, gênero, pretensão, necessidades de acessibilidade,
 *     caminho do currículo, texto livre das deficiências): só a própria pessoa e o administrador
 *     (`podeVerDadosPrivados`). Uma empresa NUNCA os vê por ter uma candidatura.
 *  2. DADOS DA CANDIDATURA (e-mail de contato e o currículo): a empresa dona da vaga, SÓ enquanto a
 *     candidatura dela estiver ativa, ou seja, nem cancelada nem rejeitada
 *     (`podeVerDadosDaCandidatura`). Quem se candidata entrega isso para ser avaliado, e nada mais.
 *  3. ADAPTAÇÕES: nem este arquivo decide. Vêm da cópia que a pessoa autorizou naquela candidatura
 *     (`CandidaturaAdaptacaoService`).
 *
 * A categoria de deficiência é privada por padrão e só entra no perfil público se a própria pessoa
 * ligar `exibirDeficienciaNoPerfil`, uma escolha independente de qualquer candidatura.
 */

/** Campos do próprio candidato visíveis para qualquer usuário autenticado. */
const CAMPOS_PUBLICOS_CANDIDATO = new Set([
    "id",
    "usuarioId",
    "biografia",
    "escolaridade",
    "tituloProfissional",
    "cidade",
    "estado",
    // Público pelo mesmo motivo que cidade e estado: é localidade, e mais grossa que as duas.
    "pais",
    "disponibilidade",
    "linkedin",
    "github",
    "usuario",
    "experiencias",
    "formacoes",
    "certificados",
    "habilidades",
    // `deficiencias` NÃO está aqui: só aparece com `exibirDeficienciaNoPerfil` (ver abaixo).
    "criadoEm",
    "atualizadoEm"
]);

/** Campos do Usuario aninhado visíveis para qualquer usuário autenticado. */
const CAMPOS_PUBLICOS_USUARIO = new Set([
    "id",
    "nome",
    "fotoPerfil",
    "capaPerfil",
    "tipoUsuario",
    "perfilPublico"
]);

/** Status em que a empresa já não precisa dos dados da candidatura: a pessoa desistiu ou foi rejeitada. */
export const STATUS_SEM_ACESSO_DA_EMPRESA = ["cancelada", "rejeitada"];

/**
 * A empresa autenticada tem, em vaga PRÓPRIA, uma candidatura ATIVA deste candidato? Escopo duplo:
 * só as vagas dela e só candidaturas que não estão canceladas nem rejeitadas.
 */
export async function empresaTemCandidaturaAtivaDoCandidato(solicitante, candidatoId) {
    if (!solicitante || solicitante.tipoUsuario !== "empresa") {
        return false;
    }

    const empresa = await Empresa.findOne({ where: { usuarioId: solicitante.id } });
    if (!empresa) {
        return false;
    }

    const candidatura = await Candidatura.findOne({
        where: { candidatoId, status: { [Op.notIn]: STATUS_SEM_ACESSO_DA_EMPRESA } },
        include: [
            {
                model: Vaga,
                as: "vaga",
                attributes: [],
                where: { empresaId: empresa.id },
                required: true
            }
        ]
    });

    return Boolean(candidatura);
}

/**
 * Pode ver os campos PRIVADOS do candidato: só a própria pessoa e o administrador. Nunca uma
 * empresa, mesmo com candidatura.
 */
export async function podeVerDadosPrivados(candidato, solicitante) {
    if (!solicitante) {
        return false;
    }

    if (ehAdministrador(solicitante)) {
        return true;
    }

    return String(solicitante.id) === String(candidato.usuarioId);
}

/**
 * Pode ver o e-mail de contato e o currículo (o que a candidatura entrega): a própria pessoa, o
 * administrador, ou a empresa dona da vaga com candidatura ativa. Bloqueio entre as partes sempre
 * nega, mesmo que houvesse candidatura.
 */
export async function podeVerDadosDaCandidatura(candidato, solicitante) {
    if (await podeVerDadosPrivados(candidato, solicitante)) {
        return true;
    }

    if (!solicitante) {
        return false;
    }

    const bloqueado = await BloqueioService.estaBloqueadoEntre(
        solicitante.id,
        candidato.usuarioId
    );

    if (bloqueado) {
        return false;
    }

    return empresaTemCandidaturaAtivaDoCandidato(solicitante, candidato.id);
}

/**
 * Tira o vínculo candidato-deficiência (`CandidatoDeficiencia`, com `observacoes`) de uma deficiência. Vale
 * para instância Sequelize (o vínculo vive em `dataValues` e é o que `toJSON` serializa) e para objeto
 * simples.
 */
function esconderVinculoDaDeficiencia(deficiencia) {
    if (typeof deficiencia.setDataValue === "function") {
        deficiencia.setDataValue("CandidatoDeficiencia", undefined);
    }

    deficiencia.CandidatoDeficiencia = undefined;
}

/** Some com um campo, em instância Sequelize (inclusive registros incluídos, que não têm setter) ou objeto simples. */
function esconderCampo(objeto, campo) {
    if (typeof objeto.setDataValue === "function") {
        objeto.setDataValue(campo, undefined);
    }

    objeto[campo] = undefined;
}

/**
 * Remove do objeto (instância Sequelize ou JSON) qualquer campo que não esteja na allowlist
 * pública. `autorizado` vem de `podeVerDadosPrivados` (dono ou administrador). Muta e devolve o
 * mesmo objeto (mesmo padrão já usado no projeto para `usuario.email = undefined`).
 *
 * `contatoLiberado` (de `podeVerDadosDaCandidatura`) deixa o e-mail de contato visível para a
 * empresa com candidatura ativa. Não libera mais nada.
 */
export function aplicarPrivacidadeCandidato(candidato, autorizado, { contatoLiberado = false } = {}) {
    if (!candidato) {
        return candidato;
    }

    // O arquivo do certificado é um documento do bucket privado (mesma
    // categoria de currículo); o restante do certificado (título,
    // instituição, link de credencial) é público normalmente, então só o
    // campo `arquivo` é escondido de terceiros, mesmo com o resto visível.
    if (!autorizado && Array.isArray(candidato.certificados)) {
        for (const certificado of candidato.certificados) {
            certificado.arquivo = undefined;
        }
    }

    if (autorizado) {
        return candidato;
    }

    // A categoria de deficiência é dado pessoal sensível: privada por padrão. Só sai para terceiros
    // se a PRÓPRIA pessoa ligou `exibirDeficienciaNoPerfil`; mesmo então, só a categoria (nome e
    // descrição), nunca o vínculo com o texto livre (`observacoes`, que pode ser informação de saúde).
    // Decidido ANTES da allowlist, que apaga `exibirDeficienciaNoPerfil` junto com os outros campos.
    const mostrarDeficiencia = candidato.exibirDeficienciaNoPerfil === true;

    if (mostrarDeficiencia && Array.isArray(candidato.deficiencias)) {
        candidato.deficiencias.forEach(esconderVinculoDaDeficiencia);
    } else {
        esconderCampo(candidato, "deficiencias");
    }

    for (const campo of Object.keys(candidato.dataValues ?? candidato)) {
        if (campo === "deficiencias" && mostrarDeficiencia) {
            continue;
        }

        if (!CAMPOS_PUBLICOS_CANDIDATO.has(campo)) {
            candidato[campo] = undefined;
        }
    }

    if (candidato.usuario) {
        const usuarioPlano = candidato.usuario.dataValues ?? candidato.usuario;
        for (const campo of Object.keys(usuarioPlano)) {
            if (contatoLiberado && campo === "email") {
                continue;
            }

            if (!CAMPOS_PUBLICOS_USUARIO.has(campo)) {
                candidato.usuario[campo] = undefined;
            }
        }
    }

    return candidato;
}
