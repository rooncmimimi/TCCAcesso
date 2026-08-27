import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: usuarios_seguidos (migration 0014)
 * Rede de seguidores entre usuários da plataforma.
 */
const UsuarioSeguido = sequelize.define(
    "UsuarioSeguido",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        seguidorId: {
            field: "seguidor_id",
            type: DataTypes.UUID,
            allowNull: false
        },
        seguidoId: {
            field: "seguido_id",
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "usuarios_seguidos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ["seguidor_id", "seguido_id"]
            }
        ]
    }
);

export default UsuarioSeguido;
