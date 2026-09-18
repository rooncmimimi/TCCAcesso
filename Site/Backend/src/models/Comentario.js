import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

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
            type: DataTypes.UUID,
            allowNull: false
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        comentario: {
            type: DataTypes.TEXT,
            allowNull: false
        }
,

        comentarioPaiId: {
            type: DataTypes.UUID
        },

        editadoEm: {
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
    }
);

export default Comentario;
