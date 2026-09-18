import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela: candidato_formacoes
 */
const CandidatoFormacao = sequelize.define(
    "CandidatoFormacao",
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
        instituicao: {
            type: DataTypes.STRING(180),
            allowNull: false
        },
        curso: {
            type: DataTypes.STRING(180),
            allowNull: false
        },
        nivel: {
            type: DataTypes.STRING(80)
        },
        dataInicio: {
            type: DataTypes.DATEONLY
        },
        dataFim: {
            type: DataTypes.DATEONLY
        },
        emAndamento: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        descricao: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "candidato_formacoes",
    }
);

export default CandidatoFormacao;
