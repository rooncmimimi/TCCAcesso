import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: notificacoes
 * ENUM tipo_notificacao do banco.
 */
export const TIPOS_NOTIFICACAO = [
    "Sistema",
    "Mensagem",
    "Vaga",
    "Candidatura",
    "Feed"
];

const Notificacao = sequelize.define(
    "Notificacao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        tipo: {
            type: DataTypes.ENUM(...TIPOS_NOTIFICACAO),
            allowNull: false
        },

        titulo: {
            type: DataTypes.STRING(200),
            allowNull: false
        },

        descricao: {
            type: DataTypes.TEXT
        },

        lida: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: "notificacoes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Notificacao;
