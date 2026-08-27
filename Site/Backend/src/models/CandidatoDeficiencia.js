import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: candidato_deficiencias (associativa)
 */
const CandidatoDeficiencia = sequelize.define(
    "CandidatoDeficiencia",
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

        deficienciaId: {
            field: "deficiencia_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        observacoes: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "candidato_deficiencias",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["candidato_id", "deficiencia_id"]
            }
        ]
    }
);

export default CandidatoDeficiencia;
