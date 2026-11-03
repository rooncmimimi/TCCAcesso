import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `codigos_recuperacao_totp`: códigos de uso único de quem perdeu o aplicativo autenticador.
 * Guarda só o HMAC (`codigoHash`); o valor em claro aparece uma vez, quando é gerado.
 */
const CodigoRecuperacaoTotp = sequelize.define(
    "CodigoRecuperacaoTotp",
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

        codigoHash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true
        },

        usadoEm: {
            type: DataTypes.DATE
        }
    },
    {
        tableName: "codigos_recuperacao_totp",
        updatedAt: false
    }
);

export default CodigoRecuperacaoTotp;
