import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: candidato_certificados (migration 0004)
 */
const CandidatoCertificado = sequelize.define(
    "CandidatoCertificado",
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
        titulo: {
            type: DataTypes.STRING(180),
            allowNull: false
        },
        instituicao: {
            type: DataTypes.STRING(180)
        },
        emitidoEm: {
            field: "emitido_em",
            type: DataTypes.DATEONLY
        },
        expiraEm: {
            field: "expira_em",
            type: DataTypes.DATEONLY
        },
        credencialUrl: {
            field: "credencial_url",
            type: DataTypes.STRING(500)
        },
        arquivo: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "candidato_certificados",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default CandidatoCertificado;
