import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

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
            type: DataTypes.UUID,
            allowNull: false
        },

        empresaId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "empresas_seguidas",
        updatedAt: false,
        indexes: [
            {
                unique: true,
                fields: ["candidato_id", "empresa_id"]
            }
        ]
    }
);

export default EmpresaSeguida;
