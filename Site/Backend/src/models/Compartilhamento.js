import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela: compartilhamentos
 */
const Compartilhamento = sequelize.define(
    "Compartilhamento",
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
        },
        comentario: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "compartilhamentos",
        updatedAt: false
    }
);

export default Compartilhamento;
