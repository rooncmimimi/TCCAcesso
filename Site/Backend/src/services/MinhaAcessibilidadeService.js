import { Candidato, PerfilAdaptacao, PreferenciaComunicacao } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import {
    ADAPTACOES,
    CANAIS_A_EVITAR,
    CANAIS_DE_COMUNICACAO,
    GRUPOS_DE_ADAPTACAO,
    RESPOSTAS_DA_EMPRESA,
    VERSAO_DO_TERMO_DE_ADAPTACOES,
    canaisEmConflito,
    chavesDesconhecidas,
    normalizarPerfilDeAdaptacao,
    normalizarPreferenciasDeComunicacao
} from "../utils/adaptacoes.js";

/**
 * "Minha Acessibilidade": o perfil de adaptações profissionais, as preferências de comunicação e a
 * escolha de exibir a categoria de deficiência no perfil público.
 *
 * TUDO AQUI É PRIVADO: só a própria pessoa lê e edita, escopado ao candidato da sessão (nunca por
 * um id vindo da requisição). Nenhuma rota de terceiros passa por este service. Compartilhar com
 * uma empresa é outro caminho (`CandidaturaAdaptacaoService`), candidatura por candidatura.
 * Não pede nem guarda diagnóstico, e não infere nada.
 */
class MinhaAcessibilidadeService {
    catalogo() {
        return {
            grupos: GRUPOS_DE_ADAPTACAO,
            adaptacoes: ADAPTACOES,
            canaisPreferidos: CANAIS_DE_COMUNICACAO,
            canaisAEvitar: CANAIS_A_EVITAR,
            respostasDaEmpresa: RESPOSTAS_DA_EMPRESA,
            termoVersao: VERSAO_DO_TERMO_DE_ADAPTACOES
        };
    }

    async candidatoDoUsuario(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            throw ErroApi.acessoNegado("Apenas candidatos têm a página Minha Acessibilidade.");
        }

        return candidato;
    }

    /** O perfil e as preferências, no formato que a tela usa. */
    async obter(solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const { perfil, comunicacao, deficiencias } = await this.carregarParaCopia(candidato.id, candidato);

        return {
            adaptacoes: perfil?.adaptacoes ?? [],
            observacao: perfil?.observacao ?? null,
            comunicacao: {
                canaisPreferidos: comunicacao?.canaisPreferidos ?? [],
                canaisAEvitar: comunicacao?.canaisAEvitar ?? [],
                melhorHorario: comunicacao?.melhorHorario ?? null,
                observacao: comunicacao?.observacao ?? null
            },
            privacidade: { exibirDeficienciaNoPerfil: candidato.exibirDeficienciaNoPerfil === true },
            // Só o nome da categoria, para a pessoa saber o que está decidindo exibir ou compartilhar.
            deficiencias: deficiencias.map((d) => ({ id: d.id, nome: d.nome }))
        };
    }

    /**
     * Lê, do banco, tudo o que pode virar a cópia de uma candidatura. Só quem monta cópia (o
     * service de adaptações da candidatura) e a própria tela chamam isto, sempre para o candidato da
     * sessão. O texto livre do vínculo da deficiência (`observacoes`) não é carregado.
     */
    async carregarParaCopia(candidatoId, candidato = null, { transaction } = {}) {
        const [perfil, comunicacao] = await Promise.all([
            PerfilAdaptacao.findOne({ where: { candidatoId }, transaction }),
            PreferenciaComunicacao.findOne({ where: { candidatoId }, transaction })
        ]);

        const dono = candidato ?? (await Candidato.findByPk(candidatoId, { transaction }));
        const deficiencias = dono ? await dono.getDeficiencias({ joinTableAttributes: [], transaction }) : [];

        return { perfil, comunicacao, deficiencias };
    }

    async atualizarAdaptacoes(solicitante, corpo = {}) {
        const desconhecidas = chavesDesconhecidas(corpo.adaptacoes, ADAPTACOES);

        if (desconhecidas.length > 0) {
            throw ErroApi.requisicaoInvalida("Há adaptações que não existem na lista.");
        }

        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const dados = normalizarPerfilDeAdaptacao(corpo);
        const existente = await PerfilAdaptacao.findOne({ where: { candidatoId: candidato.id } });

        if (existente) {
            await existente.update(dados);
        } else {
            await PerfilAdaptacao.create({ candidatoId: candidato.id, ...dados });
        }

        return this.obter(solicitante);
    }

    async atualizarComunicacao(solicitante, corpo = {}) {
        if (
            chavesDesconhecidas(corpo.canaisPreferidos, CANAIS_DE_COMUNICACAO).length > 0 ||
            chavesDesconhecidas(corpo.canaisAEvitar, CANAIS_A_EVITAR).length > 0
        ) {
            throw ErroApi.requisicaoInvalida("Há canais de comunicação que não existem na lista.");
        }

        const dados = normalizarPreferenciasDeComunicacao(corpo);

        if (canaisEmConflito(dados.canaisPreferidos, dados.canaisAEvitar).length > 0) {
            throw ErroApi.requisicaoInvalida("Um mesmo canal não pode ser preferido e evitado ao mesmo tempo.");
        }

        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const existente = await PreferenciaComunicacao.findOne({ where: { candidatoId: candidato.id } });

        if (existente) {
            await existente.update(dados);
        } else {
            await PreferenciaComunicacao.create({ candidatoId: candidato.id, ...dados });
        }

        return this.obter(solicitante);
    }

    /**
     * Exibir a categoria de deficiência no perfil público. Escolha independente: não libera nenhuma
     * outra informação e não autoriza compartilhar nada em candidatura.
     */
    async atualizarPrivacidade(solicitante, corpo = {}) {
        if (typeof corpo.exibirDeficienciaNoPerfil !== "boolean") {
            throw ErroApi.requisicaoInvalida("Informe se deseja exibir a categoria no perfil (verdadeiro ou falso).");
        }

        const candidato = await this.candidatoDoUsuario(solicitante.id);
        await candidato.update({ exibirDeficienciaNoPerfil: corpo.exibirDeficienciaNoPerfil });

        return this.obter(solicitante);
    }
}

export default new MinhaAcessibilidadeService();
