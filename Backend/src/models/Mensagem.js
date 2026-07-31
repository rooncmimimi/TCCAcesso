import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: mensagens
 */
const Mensagem = sequelize.define(
    "Mensagem",
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

        remetenteId: {
            field: "remetente_id",
            type: DataTypes.UUID,
            allowNull: false
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
        tableName: "mensagens",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Mensagem;
