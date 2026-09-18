import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

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
    }
);

export default Deficiencia;
