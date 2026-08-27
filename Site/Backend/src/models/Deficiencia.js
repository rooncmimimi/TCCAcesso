import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: deficiencias
 */
const Deficiencia = sequelize.define(
    "Deficiencia",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        nome: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },

        descricao: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "deficiencias",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Deficiencia;
