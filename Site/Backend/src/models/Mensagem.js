import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Tabela `mensagens`: as mensagens de uma conversa. */
const Mensagem = sequelize.define(
    "Mensagem",
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

        // Fica nulo quando quem enviou exclui a conta: a mensagem continua visível, com o remetente
        // exibido como "Usuário removido".
        remetenteId: {
            type: DataTypes.UUID
        },

        conteudo: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        lida: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: "mensagens"
    }
);

export default Mensagem;
