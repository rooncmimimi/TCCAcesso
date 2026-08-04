import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: candidato_experiencias (migration 0004)
 */
const CandidatoExperiencia = sequelize.define(
    "CandidatoExperiencia",
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
        cargo: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        empresa: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        local: {
            type: DataTypes.STRING(150)
        },
        modalidade: {
            type: DataTypes.STRING(50)
        },
        dataInicio: {
            field: "data_inicio",
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        dataFim: {
            field: "data_fim",
            type: DataTypes.DATEONLY
        },
        atual: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        descricao: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "candidato_experiencias",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default CandidatoExperiencia;
