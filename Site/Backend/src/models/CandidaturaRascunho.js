import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

export const ETAPAS_DO_RASCUNHO = ["mensagem", "adaptacoes", "revisao"];

/**
 * Tabela `candidatura_rascunhos`: a candidatura em preenchimento, salva no servidor.
 *
 * Vive à parte de `candidaturas` DE PROPÓSITO: o que não está em `candidaturas` não é candidatura,
 * então nenhuma lista de empresa, contagem, notificação ou relatório existente pode enxergar um
 * rascunho por engano. Só a pessoa dona lê, edita e apaga (`CandidaturaRascunhoService`).
 */
const CandidaturaRascunho = sequelize.define(
    "CandidaturaRascunho",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        candidatoId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        vagaId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        mensagem: {
            type: DataTypes.TEXT
        },

        selecao: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
        },

        etapa: {
            type: DataTypes.STRING(12),
            allowNull: false,
            defaultValue: "mensagem"
        },

        expiraEm: {
            type: DataTypes.DATE,
            allowNull: false
        }
    },
    {
        tableName: "candidatura_rascunhos"
    }
);

export default CandidaturaRascunho;
