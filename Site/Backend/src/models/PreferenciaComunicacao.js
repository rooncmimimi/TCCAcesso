import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `preferencias_comunicacao`: como a pessoa prefere ser contatada (uma por candidato).
 * PRIVADA, como `perfis_adaptacao`. Preferência de comunicação não é diagnóstico.
 */
const PreferenciaComunicacao = sequelize.define(
    "PreferenciaComunicacao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        candidatoId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        canaisPreferidos: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: false,
            defaultValue: []
        },

        canaisAEvitar: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: false,
            defaultValue: []
        },

        melhorHorario: {
            type: DataTypes.STRING(120)
        },

        observacao: {
            type: DataTypes.STRING(300)
        }
    },
    {
        tableName: "preferencias_comunicacao"
    }
);

export default PreferenciaComunicacao;
