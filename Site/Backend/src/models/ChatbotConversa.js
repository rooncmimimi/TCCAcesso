import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela: chatbot_conversas
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
            type: DataTypes.UUID,
            allowNull: false
        },
        titulo: {
            type: DataTypes.STRING(150)
        }
    },
    {
        tableName: "chatbot_conversas",
    }
);

export default ChatbotConversa;
