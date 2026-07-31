import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: favoritos_vaga
 */
const FavoritoVaga = sequelize.define(
    "FavoritoVaga",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        candidatoId: {
            field: "candidato_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        vagaId: {
            field: "vaga_id",
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "favoritos_vaga",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["candidato_id", "vaga_id"]
            }
        ]
    }
);

export default FavoritoVaga;
