import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: candidato_habilidades (migration 0004)
 */
const CandidatoHabilidade = sequelize.define(
    "CandidatoHabilidade",
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
        nome: {
            type: DataTypes.STRING(80),
            allowNull: false
        },
        nivel: {
            type: DataTypes.STRING(30)
        }
    },
    {
        tableName: "candidato_habilidades",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default CandidatoHabilidade;
