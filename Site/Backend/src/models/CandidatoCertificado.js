import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Tabela `candidato_certificados`: certificados informados pelo candidato. */
const CandidatoCertificado = sequelize.define(
    "CandidatoCertificado",
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

        titulo: {
            type: DataTypes.STRING(180),
            allowNull: false
        },

        instituicao: {
            type: DataTypes.STRING(180)
        },

        emitidoEm: {
            type: DataTypes.DATEONLY
        },

        expiraEm: {
            type: DataTypes.DATEONLY
        },

        credencialUrl: {
            type: DataTypes.STRING(500)
        }
    },
    {
        tableName: "candidato_certificados"
    }
);

export default CandidatoCertificado;
