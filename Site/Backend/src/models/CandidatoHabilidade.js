import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela: candidato_habilidades
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
    }
);

export default CandidatoHabilidade;
