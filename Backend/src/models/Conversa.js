import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: conversas
 */
const Conversa = sequelize.define(
    "Conversa",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioAId: {
            field: "usuario_a_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        usuarioBId: {
            field: "usuario_b_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        ultimaMensagem: {
            field: "ultima_mensagem",
            type: DataTypes.DATE
        }
,

        ultimaMensagemEm: {
            field: "ultima_mensagem_em",
            type: DataTypes.DATE
        },

        ultimaMensagemPrevia: {
            field: "ultima_mensagem_previa",
            type: DataTypes.STRING(180)
        }
    },
    {
        tableName: "conversas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["usuario_a_id", "usuario_b_id"]
            }
        ]
    }
);

export default Conversa;
