import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: chatbot_mensagens (migration 0012)
 */
const ChatbotMensagem = sequelize.define(
    "ChatbotMensagem",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        conversaId: {
            field: "conversa_id",
            type: DataTypes.UUID,
            allowNull: false
        },
        papel: {
            type: DataTypes.ENUM("usuario", "assistente"),
            allowNull: false
        },
        conteudo: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        contexto: {
            type: DataTypes.JSONB
        }
    },
    {
        tableName: "chatbot_mensagens",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default ChatbotMensagem;
