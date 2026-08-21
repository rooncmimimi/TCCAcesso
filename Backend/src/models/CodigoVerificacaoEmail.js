import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: codigos_verificacao_email (migration 0018)
 * Apenas o hash do código é persistido.
 */
const CodigoVerificacaoEmail = sequelize.define(
    "CodigoVerificacaoEmail",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false
        },
        novoEmail: {
            field: "novo_email",
            type: DataTypes.STRING(150),
            allowNull: false
        },
        codigoHash: {
            field: "codigo_hash",
            type: DataTypes.STRING(255),
            allowNull: false
        },
        expiraEm: {
            field: "expira_em",
            type: DataTypes.DATE,
            allowNull: false
        },
        tentativas: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 0
        },
        utilizadoEm: {
            field: "utilizado_em",
            type: DataTypes.DATE
        }
    },
    {
        tableName: "codigos_verificacao_email",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default CodigoVerificacaoEmail;
