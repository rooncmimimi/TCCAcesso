import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `codigos_verificacao_email`: códigos de 6 dígitos (só o hash) para confirmar um cadastro
 * novo ou a troca de e-mail. Na confirmação de cadastro, `novoEmail` é o próprio e-mail da conta.
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
            type: DataTypes.UUID,
            allowNull: false
        },

        novoEmail: {
            type: DataTypes.STRING(150),
            allowNull: false
        },

        codigoHash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        expiraEm: {
            type: DataTypes.DATE,
            allowNull: false
        },

        tentativas: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 0
        },

        utilizadoEm: {
            type: DataTypes.DATE
        }
    },
    {
        tableName: "codigos_verificacao_email",
        updatedAt: false
    }
);

export default CodigoVerificacaoEmail;
