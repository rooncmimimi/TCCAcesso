import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: chatbot_conversas (migration 0012)
 */
const ChatbotConversa = sequelize.define(
    "ChatbotConversa",
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
        titulo: {
            type: DataTypes.STRING(150)
        }
    },
    {
        tableName: "chatbot_conversas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default ChatbotConversa;
