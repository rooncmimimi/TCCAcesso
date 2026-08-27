import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: compartilhamentos (migration 0007)
 */
const Compartilhamento = sequelize.define(
    "Compartilhamento",
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
        },
        comentario: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "compartilhamentos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default Compartilhamento;
