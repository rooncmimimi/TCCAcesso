import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: comentarios
 */
const Comentario = sequelize.define(
    "Comentario",
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
            type: DataTypes.TEXT,
            allowNull: false
        }
,

        comentarioPaiId: {
            field: "comentario_pai_id",
            type: DataTypes.UUID
        },

        editadoEm: {
            field: "editado_em",
            type: DataTypes.DATE
        },

        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "comentarios",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Comentario;
