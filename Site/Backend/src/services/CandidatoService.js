import { Op } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import {
    Candidato,
    Usuario,
    Deficiencia,
    CandidatoDeficiencia
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import { garantirDono, ehAdministrador } from "../utils/autorizacao.js";
import {
    podeVerDadosPrivados,
    aplicarPrivacidadeCandidato
} from "../utils/candidatoPrivacidade.js";
import { gerarUrlAssinada } from "../utils/supabaseStorage.js";
import { hashToken } from "../utils/tokens.js";
import { extrairTextoDocumento } from "../utils/extrairTextoDocumento.js";
import { parsearCurriculo } from "../utils/parsearCurriculo.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";

/**
 * Campos que o próprio candidato pode atualizar via PUT /candidatos/:id.
 *
 * `curriculo` é deliberadamente excluído daqui: só pode ser definido pelo
 * upload dedicado (`PATCH /candidatos/:id/curriculo` → `atualizarCurriculo`
 * abaixo), depois de passar por validação de assinatura e ir para o bucket
 * privado. Aceitar `curriculo` neste PUT genérico permitiria o cliente
 * gravar qualquer texto arbitrário no campo, contornando toda a validação
 * de upload: nunca confiar em valor de arquivo vindo direto do corpo da
 * requisição.
 */
const CAMPOS_EDITAVEIS = [
    "cpf",
    "dataNascimento",
    "genero",
    "biografia",
    "escolaridade",
    "linkedin",
    "github",
    "cidade",
    "estado",
    "pais",
    "endereco",
    "cep",
    "disponibilidade",
    "pretensaoSalarial",
    "tituloProfissional",
    "necessidadesAcessibilidade"
];

/**
 * Perfil de candidato: dados, currículo (URL assinada, envio e importação) e deficiências
 * vinculadas. Campos privados só saem para quem `podeVerDadosPrivados` autoriza
 * (`candidatoPrivacidade.js`).
 */
class CandidatoService {
    filtrarCampos(data) {
        const campos = CAMPOS_EDITAVEIS.reduce((acc, campo) => {
            if (data[campo] !== undefined) {
                acc[campo] = data[campo];
            }
            return acc;
        }, {});

        // O cadastro envia `escolaridade: ""` quando a pessoa não escolhe nada. Vazia é "não informada",
        // o mesmo que nunca ter preenchido: grava NULL, e não uma string vazia que parece um valor.
        if (campos.escolaridade === "") {
            campos.escolaridade = null;
        }

        return campos;
    }

    /*
     * Busca de talentos (empresa ou administrador).
     *
     * A empresa vê cada candidato como qualquer terceiro: só a allowlist pública de
     * `candidatoPrivacidade.js`. Antes esta lista devolvia as linhas inteiras (CPF decifrado, endereço,
     * CEP, nascimento, necessidades de acessibilidade, caminho do currículo, e-mail e telefone) a qualquer
     * conta de empresa, mesmo sem candidatura nenhuma, o que contradizia o Aviso de Privacidade. Os dados
     * privados de quem se candidata a uma vaga da empresa saem pelo fluxo da candidatura, não por esta busca.
     *
     * Deficiência não entra na busca de talentos: nem devolvida, nem como filtro (filtrar por ela revelaria
     * a declaração por inferência). O Aviso de Privacidade promete isso. Só o administrador (moderação) usa.
     */
    async listar(query, solicitante = null) {
        const administrador = ehAdministrador(solicitante);
        const { pagina, limite, offset } = resolverPaginacao(query);
        const { nome, cidade, estado } = query;
        const deficienciaId = administrador ? query.deficienciaId : undefined;

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
            }
        ];

        if (administrador) {
            include.push({
                model: Deficiencia,
                as: "deficiencias",
                through: { attributes: [] },
                required: Boolean(deficienciaId),
                ...(deficienciaId ? { where: { id: deficienciaId } } : {})
            });
        }

        const { rows, count } = await Candidato.findAndCountAll({
            where: whereCandidato,
            include,
            limit: limite,
            offset,
            distinct: true,
            order: [["criadoEm", "DESC"]]
        });

        const candidatos = rows.map((candidato) => {
            const visivel = aplicarPrivacidadeCandidato(candidato, administrador);

            // A consulta já não traz deficiência para quem não é administrador; isto garante que nenhuma
            // mudança futura na consulta a faça aparecer na busca de talentos.
            if (!administrador && visivel) {
                if (typeof visivel.setDataValue === "function") visivel.setDataValue("deficiencias", undefined);
                visivel.deficiencias = undefined;
            }

            return visivel;
        });

        return montarResposta("candidatos", candidatos, count, pagina, limite);
    }

    /*
     * Buscar por id. Contra IDOR: nunca devolve CPF, telefone, endereço, currículo ou necessidades
     * de acessibilidade a quem não é dono, empresa com candidatura legítima ou administrador.
     */
    async buscarPorId(id, solicitante = null) {
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
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        const autorizado = await podeVerDadosPrivados(candidato, solicitante);

        return aplicarPrivacidadeCandidato(candidato, autorizado);
    }

    /*
     * URL assinada do currículo (bucket privado). É o único caminho pelo qual `curriculo` vira uma
     * URL utilizável, nunca pela serialização do model. Repete a verificação de `buscarPorId`
     * (dono, empresa com candidatura legítima ou administrador) antes de gerar a URL.
     */
    /**
     * `baixar`: como em `PostagemService.gerarUrlAnexo`, força `Content-Disposition: attachment` na
     * URL assinada (download, e não exibição inline). Reautoriza do zero a cada chamada, sem
     * reaproveitar URL já emitida.
     */
    async gerarUrlCurriculo(id, solicitante, { baixar } = {}) {
        const candidato = await Candidato.findByPk(id);

        if (!candidato) {
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        const autorizado = await podeVerDadosPrivados(candidato, solicitante);

        if (!autorizado) {
            throw ErroApi.acessoNegado(
                "Você não tem permissão para acessar este currículo."
            );
        }

        if (!candidato.curriculo) {
            throw ErroApi.naoEncontrado("Este candidato ainda não enviou um currículo.");
        }

        const assinatura = await gerarUrlAssinada(candidato.curriculo, {
            download: baixar ? candidato.curriculoNome || true : undefined
        });

        return {
            url: assinatura.url,
            expiraEm: assinatura.expiraEm,
            nomeArquivo: candidato.curriculoNome || null
        };
    }

    /*
     * Definir currículo: só pelo upload dedicado, nunca pelo PUT genérico (ver `CAMPOS_EDITAVEIS`).
     */
    async atualizarCurriculo(id, { caminho, nomeOriginal }, solicitante) {
        const candidato = await Candidato.findByPk(id);

        if (!candidato) {
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        garantirDono(solicitante, candidato.usuarioId);

        await candidato.update({
            curriculo: caminho,
            curriculoNome: nomeOriginal?.slice(0, 255) || null,
            curriculoAtualizadoEm: new Date()
        });

        return this.buscarPorId(id, solicitante);
    }

    /*
     * Importar dados do currículo: extrai o texto do arquivo (sem IA) e devolve um rascunho para
     * revisão, sem gravar nada. O arquivo não vira o currículo oficial aqui; isso é uma ação
     * separada (`PATCH /candidatos/:id/curriculo`), para o currículo nunca ser trocado sem
     * confirmação.
     */
    async importarCurriculo(id, { buffer, mimetype }, solicitante) {
        const candidato = await Candidato.findByPk(id);

        if (!candidato) {
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        garantirDono(solicitante, candidato.usuarioId);

        const texto = await extrairTextoDocumento(buffer, mimetype);
        return parsearCurriculo(texto);
    }

    /* Buscar pelo usuário autenticado */
    async buscarPorUsuario(usuarioId) {
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
            throw ErroApi.naoEncontrado("Perfil de candidato não encontrado.");
        }

        return candidato;
    }

    /* Atualizar (dono ou administrador) */
    async atualizar(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const candidato = await Candidato.findByPk(id, { transaction });

            if (!candidato) {
                throw ErroApi.naoEncontrado("Candidato não encontrado.");
            }

            garantirDono(solicitante, candidato.usuarioId);

            const dados = this.filtrarCampos(data);

            if (dados.cpf && dados.cpf !== candidato.cpf) {
                const cpfExiste = await Candidato.findOne({
                    where: {
                        cpfHash: hashToken(dados.cpf),
                        id: { [Op.ne]: id }
                    },
                    transaction
                });

                if (cpfExiste) {
                    throw ErroApi.conflito("Este CPF já está cadastrado.");
                }
            }

            await candidato.update(dados, { transaction });
            await transaction.commit();

            return this.buscarPorId(id, solicitante);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* Deficiências do candidato */
    async vincularDeficiencia(candidatoId, deficienciaId, observacoes, solicitante) {
        const candidato = await Candidato.findByPk(candidatoId);

        if (!candidato) {
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        garantirDono(solicitante, candidato.usuarioId);

        const deficiencia = await Deficiencia.findByPk(deficienciaId);

        if (!deficiencia) {
            throw ErroApi.naoEncontrado("Deficiência não encontrada.");
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
            throw ErroApi.naoEncontrado("Candidato não encontrado.");
        }

        garantirDono(solicitante, candidato.usuarioId);

        const removidos = await CandidatoDeficiencia.destroy({
            where: { candidatoId, deficienciaId }
        });

        if (removidos === 0) {
            throw ErroApi.naoEncontrado("Vínculo não encontrado.");
        }

        return { mensagem: "Deficiência desvinculada com sucesso." };
    }

}

export default new CandidatoService();
