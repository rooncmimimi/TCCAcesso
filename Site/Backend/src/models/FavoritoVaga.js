import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

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
            type: DataTypes.UUID,
            allowNull: false
        },

        vagaId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "favoritos_vaga",
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ["candidato_id", "vaga_id"]
            }
        ]
    }
);

export default FavoritoVaga;
