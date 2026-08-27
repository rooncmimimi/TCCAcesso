import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: refresh_tokens (migration 0009)
 */
const RefreshToken = sequelize.define(
    "RefreshToken",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false
        },
        tokenHash: {
            field: "token_hash",
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        expiraEm: {
            field: "expira_em",
            type: DataTypes.DATE,
            allowNull: false
        },
        revogadoEm: {
            field: "revogado_em",
            type: DataTypes.DATE
        },
        substituidoPor: {
            field: "substituido_por",
            type: DataTypes.UUID
        },
        userAgent: {
            field: "user_agent",
            type: DataTypes.STRING(255)
        },
        ip: {
            type: DataTypes.STRING(64)
        }
    },
    {
        tableName: "refresh_tokens",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default RefreshToken;
