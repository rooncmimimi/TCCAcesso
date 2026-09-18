import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `sessoes`: uma sessão de login por linha. Guarda só o hash do refresh token; cada
 * renovação revoga a linha atual e cria outra, ligada por `substituidaPorId` (veja `SessaoService`).
 */
const Sessao = sequelize.define(
    "Sessao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        tokenHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },

        expiraEm: {
            type: DataTypes.DATE,
            allowNull: false
        },

        revogadaEm: {
            type: DataTypes.DATE
        },

        substituidaPorId: {
            type: DataTypes.UUID
        },

        userAgent: {
            type: DataTypes.STRING(255)
        },

        ip: {
            type: DataTypes.STRING(64)
        }
    },
    {
        tableName: "sessoes",
        updatedAt: false
    }
);

export default Sessao;
