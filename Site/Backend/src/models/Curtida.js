import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: curtidas
 */
const Curtida = sequelize.define(
    "Curtida",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        postagemId: {
            field: "postagem_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "curtidas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["postagem_id", "usuario_id"]
            }
        ]
    }
);

export default Curtida;
