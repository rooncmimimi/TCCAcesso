import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: codigos_recuperacao_senha (migration 0008)
 * Apenas o hash do código é persistido.
 */
const CodigoRecuperacaoSenha = sequelize.define(
    "CodigoRecuperacaoSenha",
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
        },
        ipSolicitante: {
            field: "ip_solicitante",
            type: DataTypes.STRING(64)
        }
    },
    {
        tableName: "codigos_recuperacao_senha",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default CodigoRecuperacaoSenha;
