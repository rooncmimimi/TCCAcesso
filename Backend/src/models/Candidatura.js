import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: candidaturas
 * ENUM status_candidatura do banco.
 */
export const STATUS_CANDIDATURA = [
    "Pendente",
    "Visualizada",
    "EmAnalise",
    "Aprovada",
    "Rejeitada",
    "Cancelada"
];

const Candidatura = sequelize.define(
    "Candidatura",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        vagaId: {
            field: "vaga_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        candidatoId: {
            field: "candidato_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM(...STATUS_CANDIDATURA),
            allowNull: false,
            defaultValue: "Pendente"
        },

        mensagem: {
            type: DataTypes.TEXT
        },

        dataCandidatura: {
            field: "data_candidatura",
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "candidaturas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Candidatura;
