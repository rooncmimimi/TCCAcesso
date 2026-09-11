import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: push_tokens (migration 0044).
 *
 * Um Expo push token por dispositivo. `token` é UNIQUE — o registro é um
 * UPSERT por token (`PushTokenService.registrar`), então trocar de conta no
 * mesmo aparelho só reaponta o `usuario_id`, nunca duplica.
 */
const PushToken = sequelize.define(
    "PushToken",
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
        token: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true
        },
        // TEXT + CHECK no banco (migration 0044), não um ENUM nativo do
        // Postgres — `STRING` + `isIn` aqui casa com isso sem o Sequelize
        // tentar criar/gerir um tipo enum que a migration não define.
        plataforma: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [["android", "ios"]] }
        }
    },
    {
        tableName: "push_tokens",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default PushToken;
