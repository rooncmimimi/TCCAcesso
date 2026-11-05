import { Op, UniqueConstraintError } from "sequelize";
import { Candidato, CandidaturaRascunho, Candidatura, Empresa, Vaga } from "../models/index.js";
import { ETAPAS_DO_RASCUNHO } from "../models/CandidaturaRascunho.js";
import ErroApi from "../utils/ErroApi.js";
import {
    ADAPTACOES,
    LIMITES,
    chavesDesconhecidas,
    normalizarEscolha,
    textoOuNulo
} from "../utils/adaptacoes.js";

/** Um rascunho parado por tanto tempo é apagado. Cada salvamento renova o prazo. */
export const DIAS_DE_VALIDADE_DO_RASCUNHO = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Rascunho da candidatura: a pessoa preenche, salva, sai e continua depois, no servidor.
 *
 * O rascunho NÃO É uma candidatura: vive em `candidatura_rascunhos`, que nenhuma consulta de empresa
 * toca. Por isso a empresa nunca o vê, não há notificação e nada de acessibilidade é compartilhado
 * enquanto a pessoa só preenche. A prévia de privacidade e a autorização acontecem no envio
 * definitivo (`CandidaturaService.criar`), que apaga o rascunho na mesma transação.
 *
 * Guarda só a mensagem e as ESCOLHAS de compartilhamento (quais itens marcou), nunca uma cópia do
 * perfil de adaptações. Não há arquivos: o currículo é o do perfil, e continua sob as regras de
 * armazenamento dele.
 *
 * Retenção: expira em `DIAS_DE_VALIDADE_DO_RASCUNHO` dias sem salvar; é apagado ao ler depois de
 * vencido, a cada 6 horas pelo servidor (`limparExpirados`) e em cascata se a vaga ou o candidato
 * forem excluídos.
 */
class CandidaturaRascunhoService {
    async candidatoDoUsuario(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            throw ErroApi.acessoNegado("Apenas candidatos podem salvar rascunhos de candidatura.");
        }

        return candidato;
    }

    prazo(agora = new Date()) {
        return new Date(agora.getTime() + DIAS_DE_VALIDADE_DO_RASCUNHO * MS_POR_DIA);
    }

    paraResposta(rascunho) {
        return {
            id: rascunho.id,
            vagaId: rascunho.vagaId,
            mensagem: rascunho.mensagem ?? "",
            selecao: rascunho.selecao ?? {},
            etapa: rascunho.etapa,
            expiraEm: rascunho.expiraEm,
            atualizadoEm: rascunho.atualizadoEm
        };
    }

    /** Apaga um rascunho vencido e devolve nulo; devolve o rascunho se ainda vale. */
    async valido(rascunho, agora = new Date()) {
        if (!rascunho) return null;

        if (new Date(rascunho.expiraEm) <= agora) {
            await rascunho.destroy();
            return null;
        }

        return rascunho;
    }

    async obter(vagaId, solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const rascunho = await CandidaturaRascunho.findOne({ where: { vagaId, candidatoId: candidato.id } });
        const vivo = await this.valido(rascunho);

        return vivo ? this.paraResposta(vivo) : null;
    }

    async listar(solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);

        const rascunhos = await CandidaturaRascunho.findAll({
            where: { candidatoId: candidato.id, expiraEm: { [Op.gt]: new Date() } },
            include: [
                {
                    model: Vaga,
                    as: "vaga",
                    attributes: ["id", "titulo", "status"],
                    include: [{ model: Empresa, as: "empresa", attributes: ["id", "nomeFantasia", "razaoSocial"] }]
                }
            ],
            order: [["atualizadoEm", "DESC"]]
        });

        return rascunhos.map((r) => ({
            ...this.paraResposta(r),
            vaga: r.vaga
                ? {
                      id: r.vaga.id,
                      titulo: r.vaga.titulo,
                      status: r.vaga.status,
                      empresa: r.vaga.empresa?.nomeFantasia || r.vaga.empresa?.razaoSocial || null
                  }
                : null
        }));
    }

    validarCorpo(corpo = {}) {
        if (chavesDesconhecidas(corpo.selecao?.adaptacoes, ADAPTACOES).length > 0) {
            throw ErroApi.requisicaoInvalida("Há adaptações que não existem na lista.");
        }

        if (corpo.etapa !== undefined && !ETAPAS_DO_RASCUNHO.includes(corpo.etapa)) {
            throw ErroApi.requisicaoInvalida("Etapa do rascunho inválida.");
        }

        if (corpo.mensagem !== undefined && corpo.mensagem !== null && typeof corpo.mensagem !== "string") {
            throw ErroApi.requisicaoInvalida("Mensagem inválida.");
        }
    }

    async salvar(vagaId, corpo = {}, solicitante) {
        this.validarCorpo(corpo);

        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const vaga = await Vaga.findByPk(vagaId, { attributes: ["id", "status"] });

        if (!vaga) {
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        if (vaga.status !== "aberta") {
            throw ErroApi.requisicaoInvalida("Esta vaga não está aberta para candidaturas.");
        }

        // Quem já se candidatou não tem o que rascunhar: evita duplicidade com a candidatura de verdade.
        const jaCandidatado = await Candidatura.findOne({ where: { vagaId, candidatoId: candidato.id } });

        if (jaCandidatado) {
            throw ErroApi.conflito("Você já se candidatou a esta vaga.");
        }

        const dados = {
            mensagem: textoOuNulo(corpo.mensagem, LIMITES.mensagemCandidatura),
            selecao: normalizarEscolha(corpo.selecao ?? {}),
            etapa: corpo.etapa ?? "mensagem",
            expiraEm: this.prazo()
        };

        const gravar = async () => {
            const existente = await CandidaturaRascunho.findOne({ where: { vagaId, candidatoId: candidato.id } });

            if (existente) {
                await existente.update(dados);
                return existente;
            }

            return CandidaturaRascunho.create({ vagaId, candidatoId: candidato.id, ...dados });
        };

        try {
            return this.paraResposta(await gravar());
        } catch (erro) {
            // Duas abas salvando ao mesmo tempo: a restrição única impede o segundo rascunho; atualiza o que ficou.
            if (erro instanceof UniqueConstraintError) {
                return this.paraResposta(await gravar());
            }

            throw erro;
        }
    }

    async descartar(vagaId, solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const removidos = await CandidaturaRascunho.destroy({ where: { vagaId, candidatoId: candidato.id } });

        return { descartado: removidos > 0 };
    }

    /** Chamado pelo envio definitivo, dentro da transação da candidatura. */
    async apagarDoEnvio(vagaId, candidatoId, { transaction } = {}) {
        await CandidaturaRascunho.destroy({ where: { vagaId, candidatoId }, transaction });
    }

    /** Rotina periódica do servidor. */
    async limparExpirados(agora = new Date()) {
        return CandidaturaRascunho.destroy({ where: { expiraEm: { [Op.lte]: agora } } });
    }
}

export default new CandidaturaRascunhoService();
