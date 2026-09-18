import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `tokens_push`: um Expo push token por aparelho. `token` é único e o registro é um upsert
 * (`NotificacaoPushService.registrar`), então trocar de conta no mesmo aparelho só reaponta o
 * `usuarioId`, sem duplicar a linha.
 */
const TokenPush = sequelize.define(
    "TokenPush",
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

        token: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true
        },

        plataforma: {
            type: DataTypes.ENUM("android", "ios"),
            allowNull: false
        }
    },
    {
        tableName: "tokens_push"
    }
);

export default TokenPush;
