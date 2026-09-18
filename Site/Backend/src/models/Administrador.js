import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Tabela `administradores`: dados extras de uma conta com `tipoUsuario` administrador. */
const Administrador = sequelize.define(
    "Administrador",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        nivel: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 1
        }
    },
    {
        tableName: "administradores"
    }
);

export default Administrador;
