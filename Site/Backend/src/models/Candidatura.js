import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Valores do enum `status_candidatura`, na ordem em que a candidatura costuma andar. */
export const STATUS_CANDIDATURA = [
    "pendente",
    "visualizada",
    "em_analise",
    "aprovada",
    "rejeitada",
    "cancelada"
];

/** Tabela `candidaturas`: a candidatura de um candidato a uma vaga (uma por par). */
const Candidatura = sequelize.define(
    "Candidatura",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        vagaId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        candidatoId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM(...STATUS_CANDIDATURA),
            allowNull: false,
            defaultValue: "pendente"
        },

        mensagem: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "candidaturas"
    }
);

export default Candidatura;
