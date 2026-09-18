import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

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
            type: DataTypes.UUID,
            allowNull: false
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "curtidas",
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ["postagem_id", "usuario_id"]
            }
        ]
    }
);

export default Curtida;
