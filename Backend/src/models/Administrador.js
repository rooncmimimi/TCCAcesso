import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: administradores
 */
const Administrador = sequelize.define(
    "Administrador",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        nivel: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 1
        }
    },
    {
        tableName: "administradores",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Administrador;
