import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela: chatbot_mensagens
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
        updatedAt: false
    }
);

export default ChatbotMensagem;
