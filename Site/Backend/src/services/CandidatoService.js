import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Candidato,
    Usuario,
    Deficiencia,
    CandidatoDeficiencia
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, ehAdministrador } from "../utils/authorization.js";
import {
    podeVerDadosPrivados,
    aplicarPrivacidadeCandidato
} from "../utils/candidatoPrivacidade.js";
import { gerarUrlAssinada } from "../utils/supabaseStorage.js";
import AdminAuditService from "./AdminAuditService.js";

/**
 * Campos que o próprio candidato pode atualizar via PUT /candidatos/:id.
 *
 * `curriculo` é DELIBERADAMENTE excluído daqui: só pode ser definido pelo
 * upload dedicado (`PATCH /candidatos/:id/curriculo` → `atualizarCurriculo`
 * abaixo), depois de passar por validação de assinatura e ir para o bucket
 * privado. Aceitar `curriculo` neste PUT genérico permitiria o cliente
 * gravar qualquer texto arbitrário no campo, contornando toda a validação
 * de upload — nunca confiar em valor de arquivo vindo direto do corpo da
 * requisição.
 */
const CAMPOS_EDITAVEIS = [
    "cpf",
    "dataNascimento",
    "genero",
    "biografia",
    "escolaridade",
    "experiencia",
    "habilidades",
    "linkedin",
    "github",
    "cidade",
    "estado",
    "endereco",
    "cep",
    "disponibilidade",
    "pretensaoSalarial",
    "tituloProfissional",
    "necessidadesAcessibilidade"
];

class CandidatoService {
    filtrarCampos(data) {
        return CAMPOS_EDITAVEIS.reduce((acc, campo) => {
            if (data[campo] !== undefined) {
                acc[campo] = data[campo];
            }
            return acc;
        }, {});
    }

    /* ==========================================================
       LISTAR (empresa / administrador)
    ========================================================== */
    async findAll(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);
        const { nome, cidade, estado, deficienciaId } = query;

        const whereCandidato = {};
        const whereUsuario = { ativo: true };

        if (cidade) {
            whereCandidato.cidade = { [Op.iLike]: `%${cidade}%` };
        }

        if (estado) {
            whereCandidato.estado = estado.toUpperCase();
        }

        if (nome) {
            whereUsuario.nome = { [Op.iLike]: `%${nome}%` };
        }

        const include = [
            {
                model: Usuario,
                as: "usuario",
                where: whereUsuario,
                required: true
            },
            {
                model: Deficiencia,
                as: "deficiencias",
                through: { attributes: [] },
                required: Boolean(deficienciaId),
                ...(deficienciaId ? { where: { id: deficienciaId } } : {})
            }
        ];

        const { rows, count } = await Candidato.findAndCountAll({
            where: whereCandidato,
            include,
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("candidatos", rows, count, pagina, limite);
    }

    /* ==========================================================
       BUSCAR POR ID
       (correção de IDOR — nunca devolve CPF/telefone/endereço/currículo/
       necessidades de acessibilidade para quem não é dono, empresa com
       candidatura legítima ou administrador)
    ========================================================== */
    async findById(id, solicitante = null) {
        const candidato = await Candidato.findByPk(id, {
            include: [
                { model: Usuario, as: "usuario" },
                {
                    model: Deficiencia,
                    as: "deficiencias",
                    through: { attributes: ["observacoes"] }
                }
            ]
        });

        if (!candidato) {
            throw ApiError.notFound("Candidato não encontrado.");
        }

        const autorizado = await podeVerDadosPrivados(candidato, solicitante);

        return aplicarPrivacidadeCandidato(candidato, autorizado);
    }

    /* ==========================================================
       URL ASSINADA DO CURRÍCULO (bucket privado)
       Único caminho pelo qual o valor de `curriculo` vira uma URL
       utilizável — nunca por serialização direta do model. Repete a
       mesma verificação de autorização de `findById` (dono, empresa com
       candidatura legítima, ou administrador) antes de gerar a URL.
    ========================================================== */
    async gerarUrlCurriculo(id, solicitante) {
        const candidato = await Candidato.findByPk(id);

        if (!candidato) {
            throw ApiError.notFound("Candidato não encontrado.");
        }

        const autorizado = await podeVerDadosPrivados(candidato, solicitante);

        if (!autorizado) {
            throw ApiError.forbidden(
                "Você não tem permissão para acessar este currículo."
            );
        }

        if (!candidato.curriculo) {
            throw ApiError.notFound("Este candidato ainda não enviou um currículo.");
        }

        const assinatura = await gerarUrlAssinada(candidato.curriculo);

        return {
            url: assinatura.url,
            expiraEm: assinatura.expiraEm,
            nomeArquivo: candidato.curriculoNome || null
        };
    }

    /* ==========================================================
       DEFINIR CURRÍCULO (só a partir do upload dedicado — nunca do PUT
       genérico, ver comentário em CAMPOS_EDITAVEIS)
    ========================================================== */
    async atualizarCurriculo(id, { caminho, nomeOriginal }, solicitante) {
        const candidato = await Candidato.findByPk(id);

        if (!candidato) {
            throw ApiError.notFound("Candidato não encontrado.");
        }

        garantirDono(solicitante, candidato.usuarioId);

        await candidato.update({
            curriculo: caminho,
            curriculoNome: nomeOriginal?.slice(0, 255) || null,
            curriculoAtualizadoEm: new Date()
        });

        return this.findById(id, solicitante);
    }

    /* ==========================================================
       BUSCAR PELO USUÁRIO AUTENTICADO
    ========================================================== */
    async findByUsuario(usuarioId) {
        const candidato = await Candidato.findOne({
            where: { usuarioId },
            include: [
                { model: Usuario, as: "usuario" },
                {
                    model: Deficiencia,
                    as: "deficiencias",
                    through: { attributes: ["observacoes"] }
                }
            ]
        });

        if (!candidato) {
            throw ApiError.notFound("Perfil de candidato não encontrado.");
        }

        return candidato;
    }

    /* ==========================================================
       ATUALIZAR (dono ou administrador)
    ========================================================== */
    async update(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const candidato = await Candidato.findByPk(id, { transaction });

            if (!candidato) {
                throw ApiError.notFound("Candidato não encontrado.");
            }

            garantirDono(solicitante, candidato.usuarioId);

            const dados = this.filtrarCampos(data);

            if (dados.cpf && dados.cpf !== candidato.cpf) {
                const cpfExiste = await Candidato.findOne({
                    where: {
                        cpf: dados.cpf,
                        id: { [Op.ne]: id }
                    },
                    transaction
                });

                if (cpfExiste) {
                    throw ApiError.conflict("CPF já cadastrado.");
                }
            }

            await candidato.update(dados, { transaction });
            await transaction.commit();

            return this.findById(id, solicitante);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       DEFICIÊNCIAS DO CANDIDATO
    ========================================================== */
    async vincularDeficiencia(candidatoId, deficienciaId, observacoes, solicitante) {
        const candidato = await Candidato.findByPk(candidatoId);

        if (!candidato) {
            throw ApiError.notFound("Candidato não encontrado.");
        }

        garantirDono(solicitante, candidato.usuarioId);

        const deficiencia = await Deficiencia.findByPk(deficienciaId);

        if (!deficiencia) {
            throw ApiError.notFound("Deficiência não encontrada.");
        }

        const [vinculo, criado] = await CandidatoDeficiencia.findOrCreate({
            where: { candidatoId, deficienciaId },
            defaults: { observacoes: observacoes || null }
        });

        if (!criado) {
            await vinculo.update({ observacoes: observacoes ?? vinculo.observacoes });
        }

        return vinculo;
    }

    async desvincularDeficiencia(candidatoId, deficienciaId, solicitante) {
        const candidato = await Candidato.findByPk(candidatoId);

        if (!candidato) {
            throw ApiError.notFound("Candidato não encontrado.");
        }

        garantirDono(solicitante, candidato.usuarioId);

        const removidos = await CandidatoDeficiencia.destroy({
            where: { candidatoId, deficienciaId }
        });

        if (removidos === 0) {
            throw ApiError.notFound("Vínculo não encontrado.");
        }

        return { mensagem: "Deficiência desvinculada com sucesso." };
    }

    /* ==========================================================
       REMOVER (administrador)
       Rota já restrita a administrador (verificado aqui também, na
       própria service) — não há caminho de "dono", auditoria sempre
       registrada.
    ========================================================== */
    async remove(id, solicitante, contexto = {}) {
        if (!ehAdministrador(solicitante)) {
            throw ApiError.forbidden("Apenas administradores podem remover candidatos.");
        }

        const transaction = await sequelize.transaction();
        let candidatoRemovido;

        try {
            const candidato = await Candidato.findByPk(id, { transaction });

            if (!candidato) {
                throw ApiError.notFound("Candidato não encontrado.");
            }

            candidatoRemovido = { id: candidato.id, usuarioId: candidato.usuarioId };

            await candidato.destroy({ transaction });
            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "EXCLUIR_CANDIDATO",
            entidadeTipo: "usuario",
            entidadeId: candidatoRemovido.usuarioId,
            descricao: "Perfil de candidato removido.",
            metadata: { candidato: candidatoRemovido },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return { mensagem: "Candidato removido com sucesso." };
    }
}

export default new CandidatoService();
