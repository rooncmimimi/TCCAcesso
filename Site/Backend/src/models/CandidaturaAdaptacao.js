import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

export const ESTADOS_DA_AUTORIZACAO = ["ativa", "retirada"];

/**
 * Tabela `candidatura_adaptacoes`: a CÓPIA, por candidatura, do que a pessoa autorizou compartilhar
 * com a empresa dona da vaga.
 *
 * `itens` (JSONB) é um retrato fechado: mudar o perfil depois não o altera. Ao retirar a
 * autorização, `itens` vira nulo e a empresa não consegue mais ler nada; sobram só os registros
 * mínimos (datas, versão e quantidade). Nunca serialize este model fora de
 * `CandidaturaAdaptacaoService`, que decide quem pode ver o quê.
 */
const CandidaturaAdaptacao = sequelize.define(
    "CandidaturaAdaptacao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        candidaturaId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        estado: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: "ativa"
        },

        finalidade: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: "processo_seletivo"
        },

        termoVersao: {
            type: DataTypes.STRING(30),
            allowNull: false
        },

        versao: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },

        itens: {
            type: DataTypes.JSONB
        },

        totalItens: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 0
        },

        autorizadoEm: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        retiradoEm: {
            type: DataTypes.DATE
        },

        resposta: {
            type: DataTypes.STRING(30)
        },

        respostaMensagem: {
            type: DataTypes.STRING(500)
        },

        respondidoEm: {
            type: DataTypes.DATE
        }
    },
    {
        tableName: "candidatura_adaptacoes"
    }
);

export default CandidaturaAdaptacao;
