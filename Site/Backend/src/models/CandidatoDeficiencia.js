import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

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
            type: DataTypes.UUID,
            allowNull: false
        },

        deficienciaId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        observacoes: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "candidato_deficiencias",
        indexes: [
            {
                unique: true,
                fields: ["candidato_id", "deficiencia_id"]
            }
        ]
    }
);

export default CandidatoDeficiencia;
