import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: empresas_seguidas
 */
const EmpresaSeguida = sequelize.define(
    "EmpresaSeguida",
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

        empresaId: {
            field: "empresa_id",
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "empresas_seguidas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["candidato_id", "empresa_id"]
            }
        ]
    }
);

export default EmpresaSeguida;
