import { Candidatura, Vaga, Empresa } from "../models/index.js";
import { ehAdministrador } from "./authorization.js";
import BloqueioService from "../services/BloqueioService.js";

/**
 * Separação de dados públicos/privados do candidato (Fase 3 — correção de
 * IDOR). Centralizado aqui porque DUAS rotas diferentes expõem o mesmo
 * `Candidato` para terceiros — `GET /candidatos/:id` e
 * `GET /perfil/candidatos/:candidatoId` — e as duas precisam da mesma regra,
 * sem duplicar a lógica.
 *
 * Estratégia: allowlist explícita (mais seguro que denylist). Um campo só
 * fica visível para terceiro se estiver nas listas abaixo; qualquer campo
 * novo adicionado ao model no futuro fica PRIVADO por padrão, até alguém
 * decidir conscientemente torná-lo público.
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
    "disponibilidade",
    "linkedin",
    "github",
    "usuario",
    "experiencias",
    "formacoes",
    "certificados",
    "habilidades",
    "deficiencias",
    "createdAt",
    "created_at",
    "updatedAt",
    "updated_at"
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

/**
 * A empresa autenticada tem candidatura (de qualquer status) do candidato
 * em alguma vaga própria? Único caso em que uma empresa deixa de ser
 * "terceiro comum" para os dados privados deste candidato.
 */
async function empresaTemCandidaturaDoCandidato(solicitante, candidatoId) {
    if (!solicitante || solicitante.tipoUsuario !== "empresa") {
        return false;
    }

    const empresa = await Empresa.findOne({ where: { usuarioId: solicitante.id } });
    if (!empresa) {
        return false;
    }

    const candidatura = await Candidatura.findOne({
        where: { candidatoId },
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
 * Decide se `solicitante` pode ver os campos privados de `candidato`
 * (dono, administrador, ou empresa com candidatura legítima) — nunca só
 * por estar autenticado. Bloqueio entre as partes sempre nega, mesmo que
 * houvesse candidatura.
 */
export async function podeVerDadosPrivados(candidato, solicitante) {
    if (!solicitante) {
        return false;
    }

    if (ehAdministrador(solicitante)) {
        return true;
    }

    const souDono = String(solicitante.id) === String(candidato.usuarioId);

    if (souDono) {
        return true;
    }

    const bloqueado = await BloqueioService.estaBloqueadoEntre(
        solicitante.id,
        candidato.usuarioId
    );

    if (bloqueado) {
        return false;
    }

    return empresaTemCandidaturaDoCandidato(solicitante, candidato.id);
}

/**
 * Remove do objeto (instância Sequelize ou JSON) qualquer campo que não
 * esteja na allowlist pública — usado quando `podeVerDadosPrivados`
 * resolveu `false`. Muta e devolve o mesmo objeto (mesmo padrão já usado
 * no projeto para `usuario.email = undefined`).
 */
export function aplicarPrivacidadeCandidato(candidato, autorizado) {
    if (!candidato) {
        return candidato;
    }

    // O arquivo do certificado é um documento do bucket privado (mesma
    // categoria de currículo) — o restante do certificado (título,
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

    for (const campo of Object.keys(candidato.dataValues ?? candidato)) {
        if (!CAMPOS_PUBLICOS_CANDIDATO.has(campo)) {
            candidato[campo] = undefined;
        }
    }

    if (candidato.usuario) {
        const usuarioPlano = candidato.usuario.dataValues ?? candidato.usuario;
        for (const campo of Object.keys(usuarioPlano)) {
            if (!CAMPOS_PUBLICOS_USUARIO.has(campo)) {
                candidato.usuario[campo] = undefined;
            }
        }
    }

    return candidato;
}
