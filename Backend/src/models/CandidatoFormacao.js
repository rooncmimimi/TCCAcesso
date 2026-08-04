import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: candidato_formacoes (migration 0004)
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
            field: "candidato_id",
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
            field: "data_inicio",
            type: DataTypes.DATEONLY
        },
        dataFim: {
            field: "data_fim",
            type: DataTypes.DATEONLY
        },
        emAndamento: {
            field: "em_andamento",
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
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default CandidatoFormacao;
