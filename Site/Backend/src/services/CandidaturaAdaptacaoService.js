import {
    Candidato,
    CandidatoExperiencia,
    CandidatoFormacao,
    CandidatoHabilidade,
    Candidatura,
    CandidaturaAdaptacao,
    Empresa,
    Usuario,
    Vaga
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { ehAdministrador, garantirEmpresaAprovada } from "../utils/autorizacao.js";
import { STATUS_SEM_ACESSO_DA_EMPRESA } from "../utils/candidatoPrivacidade.js";
import {
    ADAPTACOES,
    LIMITES,
    VERSAO_DO_TERMO_DE_ADAPTACOES,
    chavesDesconhecidas,
    montarCopiaDaCandidatura,
    normalizarEscolha,
    respostaValida,
    textoOuNulo
} from "../utils/adaptacoes.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import MinhaAcessibilidadeService from "./MinhaAcessibilidadeService.js";
import NotificacaoService from "./NotificacaoService.js";

/** O que NUNCA vai para a empresa por causa da candidatura. Mostrado na prévia. */
const NAO_COMPARTILHADO = [
    "CPF",
    "Endereço e CEP",
    "Data de nascimento e gênero",
    "Pretensão salarial",
    "Suas outras adaptações, comunicação e categoria de deficiência que você não marcar"
];

/**
 * A cópia, por candidatura, do que a pessoa AUTORIZOU compartilhar com a empresa dona da vaga.
 *
 * Regras que este service garante:
 *  - nada é compartilhado sem escolha explícita (`normalizarEscolha` começa tudo desligado) e sem
 *    a confirmação da autorização (`aceita`);
 *  - o conteúdo da cópia sai SEMPRE de `montarCopiaDaCandidatura`, lendo o perfil no servidor: o
 *    cliente nunca envia conteúdo, só as escolhas. A prévia e a gravação usam a mesma função, então
 *    a prévia mostra exatamente o que a empresa receberá;
 *  - a cópia é independente do perfil: editar o perfil depois não a altera;
 *  - a empresa só lê a cópia da candidatura de uma vaga DELA, enquanto a candidatura estiver ativa e
 *    a autorização não tiver sido retirada;
 *  - retirar apaga o conteúdo (`itens` nulo) e deixa só o registro mínimo (datas, versão, quantidade);
 *  - cada operação vai para a auditoria sem o conteúdo sensível (só versão e quantidade).
 */
class CandidaturaAdaptacaoService {
    validarEscolha(corpo = {}) {
        if (chavesDesconhecidas(corpo.adaptacoes, ADAPTACOES).length > 0) {
            throw ErroApi.requisicaoInvalida("Há adaptações que não existem na lista.");
        }
    }

    async auditar(acao, candidaturaId, cadastro, usuario) {
        // `administradorId` fica nulo: quem age é a pessoa candidata ou a empresa, não um administrador.
        // Só versão e quantidade, nunca o conteúdo.
        await AdminAuditoriaService.registrar({
            administradorId: null,
            acao,
            entidadeTipo: "candidatura",
            entidadeId: candidaturaId,
            descricao: null,
            metadados: { versao: cadastro.versao, totalItens: cadastro.totalItens, porUsuarioId: usuario?.id ?? null }
        });
    }

    /**
     * A prévia de privacidade: tudo o que a empresa receberia se a pessoa se candidatasse agora com
     * esta escolha. Não grava nada.
     */
    async montarPrevia(vagaId, corpo = {}, solicitante) {
        this.validarEscolha(corpo);

        const candidato = await Candidato.findOne({
            where: { usuarioId: solicitante.id },
            include: [{ model: Usuario, as: "usuario", attributes: ["id", "nome", "email"] }]
        });

        if (!candidato) {
            throw ErroApi.acessoNegado("Apenas candidatos têm a prévia de privacidade da candidatura.");
        }

        const vaga = await Vaga.findByPk(vagaId, {
            attributes: ["id", "titulo"],
            include: [{ model: Empresa, as: "empresa", attributes: ["id", "nomeFantasia", "razaoSocial"] }]
        });

        if (!vaga) {
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        const escolha = normalizarEscolha(corpo);
        const dados = await MinhaAcessibilidadeService.carregarParaCopia(candidato.id, candidato);
        const { itens, total } = montarCopiaDaCandidatura(dados, escolha);

        const [experiencias, formacoes, habilidades] = await Promise.all([
            CandidatoExperiencia.count({ where: { candidatoId: candidato.id } }),
            CandidatoFormacao.count({ where: { candidatoId: candidato.id } }),
            CandidatoHabilidade.count({ where: { candidatoId: candidato.id } })
        ]);

        return {
            vaga: { id: vaga.id, titulo: vaga.titulo, empresa: vaga.empresa?.nomeFantasia || vaga.empresa?.razaoSocial || null },
            dadosProfissionais: {
                nome: candidato.usuario?.nome ?? null,
                emailDeContato: candidato.usuario?.email ?? null,
                tituloProfissional: candidato.tituloProfissional ?? null,
                cidade: candidato.cidade ?? null,
                estado: candidato.estado ?? null,
                escolaridade: candidato.escolaridade ?? null,
                biografia: Boolean(candidato.biografia),
                experiencias,
                formacoes,
                habilidades,
                curriculo: candidato.curriculo ? candidato.curriculoNome || "Currículo enviado" : null
            },
            adaptacoes: { itens, total },
            naoCompartilhado: NAO_COMPARTILHADO,
            termoVersao: VERSAO_DO_TERMO_DE_ADAPTACOES
        };
    }

    /**
     * Grava a cópia no envio da candidatura, dentro da transação dela. Devolve `null` se a escolha
     * não leva nada (nenhum registro é criado: sem escolha, sem cópia).
     */
    async registrar({ candidato, candidaturaId, corpo, aceita }, { transaction } = {}) {
        this.validarEscolha(corpo);

        const escolha = normalizarEscolha(corpo);
        const dados = await MinhaAcessibilidadeService.carregarParaCopia(candidato.id, candidato, { transaction });
        const { itens, total } = montarCopiaDaCandidatura(dados, escolha);

        if (total === 0) {
            return null;
        }

        if (aceita !== true) {
            throw ErroApi.requisicaoInvalida(
                "Para compartilhar informações de acessibilidade, confirme a autorização depois de ver a prévia."
            );
        }

        const cadastro = await CandidaturaAdaptacao.create(
            {
                candidaturaId,
                estado: "ativa",
                termoVersao: VERSAO_DO_TERMO_DE_ADAPTACOES,
                versao: 1,
                itens,
                totalItens: total,
                autorizadoEm: new Date()
            },
            { transaction }
        );

        await this.auditar("adaptacoes_autorizadas", candidaturaId, cadastro, { id: candidato.usuarioId });

        return cadastro;
    }

    async candidaturaDoCandidato(candidaturaId, solicitante) {
        const candidatura = await Candidatura.findByPk(candidaturaId, {
            include: [{ model: Candidato, as: "candidato" }]
        });

        if (!candidatura) {
            throw ErroApi.naoEncontrado("Candidatura não encontrada.");
        }

        // Diferente do resto do sistema (dono OU administrador): aqui nem o administrador mexe na
        // autorização de outra pessoa. Só a própria.
        if (String(candidatura.candidato?.usuarioId) !== String(solicitante.id)) {
            throw ErroApi.acessoNegado("Você só pode gerenciar as adaptações das suas próprias candidaturas.");
        }

        return candidatura;
    }

    /** Edita o que está compartilhado (nova versão) ou autoriza de novo depois de uma retirada. */
    async editar(candidaturaId, corpo = {}, solicitante) {
        this.validarEscolha(corpo);

        const candidatura = await this.candidaturaDoCandidato(candidaturaId, solicitante);

        if (STATUS_SEM_ACESSO_DA_EMPRESA.includes(candidatura.status)) {
            throw ErroApi.requisicaoInvalida("Esta candidatura já foi encerrada.");
        }

        const escolha = normalizarEscolha(corpo);
        const dados = await MinhaAcessibilidadeService.carregarParaCopia(candidatura.candidato.id, candidatura.candidato);
        const { itens, total } = montarCopiaDaCandidatura(dados, escolha);

        if (total === 0) {
            return this.retirar(candidaturaId, solicitante);
        }

        if (corpo.aceita !== true) {
            throw ErroApi.requisicaoInvalida("Confirme a autorização depois de ver a prévia.");
        }

        const existente = await CandidaturaAdaptacao.findOne({ where: { candidaturaId } });

        const campos = {
            estado: "ativa",
            termoVersao: VERSAO_DO_TERMO_DE_ADAPTACOES,
            itens,
            totalItens: total,
            autorizadoEm: new Date(),
            retiradoEm: null,
            // Mudou o conteúdo: a resposta da empresa era sobre a versão anterior.
            resposta: null,
            respostaMensagem: null,
            respondidoEm: null
        };

        const cadastro = existente
            ? await existente.update({ ...campos, versao: existente.versao + 1 })
            : await CandidaturaAdaptacao.create({ candidaturaId, ...campos, versao: 1 });

        await this.auditar("adaptacoes_editadas", candidaturaId, cadastro, solicitante);

        return this.visaoDoCandidato(cadastro);
    }

    /** A pessoa retira a autorização: o conteúdo é apagado e a empresa não vê mais nada. */
    async retirar(candidaturaId, solicitante) {
        await this.candidaturaDoCandidato(candidaturaId, solicitante);

        return this.encerrar(candidaturaId, solicitante, "adaptacoes_retiradas");
    }

    /** Candidatura cancelada: o conteúdo compartilhado não tem mais finalidade e é apagado. */
    async encerrarPorCancelamento(candidaturaId, { transaction } = {}) {
        return this.encerrar(candidaturaId, null, "adaptacoes_encerradas", { transaction });
    }

    async encerrar(candidaturaId, usuario, acao, { transaction } = {}) {
        const cadastro = await CandidaturaAdaptacao.findOne({ where: { candidaturaId }, transaction });

        if (!cadastro || cadastro.estado === "retirada") {
            return null;
        }

        await cadastro.update(
            {
                estado: "retirada",
                itens: null,
                retiradoEm: new Date(),
                resposta: null,
                respostaMensagem: null,
                respondidoEm: null
            },
            { transaction }
        );

        await this.auditar(acao, candidaturaId, cadastro, usuario);

        return this.visaoDoCandidato(cadastro);
    }

    visaoDoCandidato(cadastro) {
        if (!cadastro) return null;

        return {
            estado: cadastro.estado,
            versao: cadastro.versao,
            finalidade: cadastro.finalidade,
            autorizadoEm: cadastro.autorizadoEm,
            retiradoEm: cadastro.retiradoEm,
            totalItens: cadastro.totalItens,
            // Nulo depois da retirada: o conteúdo não é mantido.
            itens: cadastro.estado === "ativa" ? cadastro.itens : null,
            resposta: cadastro.resposta ?? null,
            respostaMensagem: cadastro.respostaMensagem ?? null,
            respondidoEm: cadastro.respondidoEm ?? null
        };
    }

    visaoDaEmpresa(cadastro) {
        return {
            versao: cadastro.versao,
            finalidade: cadastro.finalidade,
            autorizadoEm: cadastro.autorizadoEm,
            itens: cadastro.itens,
            resposta: cadastro.resposta ?? null,
            respostaMensagem: cadastro.respostaMensagem ?? null,
            respondidoEm: cadastro.respondidoEm ?? null
        };
    }

    /** A visão do candidato dono, por candidatura (uma consulta para várias). */
    async paraOCandidato(candidaturaIds) {
        const cadastros = await CandidaturaAdaptacao.findAll({ where: { candidaturaId: candidaturaIds } });

        return new Map(cadastros.map((c) => [c.candidaturaId, this.visaoDoCandidato(c)]));
    }

    /**
     * A visão da EMPRESA. Quem chama já garantiu que a empresa é a dona de TODAS estas candidaturas;
     * aqui ficam de fora as que a pessoa retirou e as de candidatura cancelada ou rejeitada.
     */
    async paraAEmpresa(candidaturas) {
        const ativas = candidaturas.filter((c) => !STATUS_SEM_ACESSO_DA_EMPRESA.includes(c.status));

        if (ativas.length === 0) {
            return new Map();
        }

        const cadastros = await CandidaturaAdaptacao.findAll({
            where: { candidaturaId: ativas.map((c) => c.id), estado: "ativa" }
        });

        return new Map(cadastros.map((c) => [c.candidaturaId, this.visaoDaEmpresa(c)]));
    }

    /** A empresa dona da vaga responde ao pedido de adaptação. */
    async responder(candidaturaId, corpo = {}, solicitante) {
        if (!respostaValida(corpo.resposta)) {
            throw ErroApi.requisicaoInvalida("Escolha uma das respostas disponíveis.");
        }

        const candidatura = await Candidatura.findByPk(candidaturaId, {
            include: [
                { model: Vaga, as: "vaga", include: [{ model: Empresa, as: "empresa" }] },
                { model: Candidato, as: "candidato", attributes: ["id", "usuarioId"] }
            ]
        });

        if (!candidatura) {
            throw ErroApi.naoEncontrado("Candidatura não encontrada.");
        }

        // Só a empresa DONA da vaga: nem o administrador responde pela empresa.
        if (ehAdministrador(solicitante) || String(candidatura.vaga?.empresa?.usuarioId) !== String(solicitante.id)) {
            throw ErroApi.acessoNegado("Apenas a empresa dona da vaga pode responder a este pedido.");
        }

        garantirEmpresaAprovada(candidatura.vaga.empresa, solicitante);

        if (STATUS_SEM_ACESSO_DA_EMPRESA.includes(candidatura.status)) {
            throw ErroApi.requisicaoInvalida("Esta candidatura já foi encerrada.");
        }

        const cadastro = await CandidaturaAdaptacao.findOne({ where: { candidaturaId, estado: "ativa" } });

        // Mesma resposta de "não existe": a empresa não descobre se houve pedido que foi retirado.
        if (!cadastro) {
            throw ErroApi.naoEncontrado("Não há pedido de adaptação nesta candidatura.");
        }

        await cadastro.update({
            resposta: corpo.resposta,
            respostaMensagem: textoOuNulo(corpo.mensagem, LIMITES.respostaDaEmpresa),
            respondidoEm: new Date()
        });

        await this.auditar("adaptacoes_respondidas", candidaturaId, cadastro, solicitante);

        const notificacao = await NotificacaoService.criar({
            usuarioId: candidatura.candidato.usuarioId,
            tipo: "candidatura",
            titulo: "A empresa respondeu ao seu pedido de adaptação",
            descricao: `Veja a resposta na sua candidatura para a vaga "${candidatura.vaga.titulo}".`,
            subtipo: "adaptacao_respondida",
            entidadeTipo: "vaga",
            entidadeId: candidatura.vaga.id,
            atorId: solicitante.id
        });

        if (notificacao) {
            NotificacaoService.emitirNotificacaoCriada(
                notificacao,
                await NotificacaoService.contarNaoLidasDe(candidatura.candidato.usuarioId)
            );
        }

        return this.visaoDaEmpresa(cadastro);
    }
}

export default new CandidaturaAdaptacaoService();
