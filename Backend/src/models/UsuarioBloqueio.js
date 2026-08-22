import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: usuarios_bloqueados (migration 0019)
 */
const UsuarioBloqueio = sequelize.define(
    "UsuarioBloqueio",
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
        bloqueadoId: {
            field: "bloqueado_id",
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "usuarios_bloqueados",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default UsuarioBloqueio;
