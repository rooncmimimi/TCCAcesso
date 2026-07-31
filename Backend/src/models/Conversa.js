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

        candidatoId: {
            field: "candidato_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        empresaId: {
            field: "empresa_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        ultimaMensagem: {
            field: "ultima_mensagem",
            type: DataTypes.DATE
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
                fields: ["candidato_id", "empresa_id"]
            }
        ]
    }
);

export default Conversa;
