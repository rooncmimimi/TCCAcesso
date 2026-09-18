import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela: candidato_experiencias
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
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        dataFim: {
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
    }
);

export default CandidatoExperiencia;
