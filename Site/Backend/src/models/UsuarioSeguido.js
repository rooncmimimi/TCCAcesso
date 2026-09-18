import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela: usuarios_seguidos
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
            type: DataTypes.UUID,
            allowNull: false
        },
        seguidoId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "usuarios_seguidos",
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
