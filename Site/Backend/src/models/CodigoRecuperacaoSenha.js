import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `codigos_recuperacao_senha`: um pedido de redefinição de senha. Guarda só hashes, nunca o
 * valor em claro.
 *
 * `tokenHash` é o hash do token de alta entropia enviado no link do e-mail (o caminho principal);
 * `codigoHash` é o hash do código de 6 dígitos, o único que o app usa. Os dois ficam na mesma
 * linha, e usar um invalida o outro (ambos marcam `utilizadoEm`).
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
            type: DataTypes.UUID,
            allowNull: false
        },

        codigoHash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        tokenHash: {
            type: DataTypes.STRING(255)
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
        },

        ipSolicitante: {
            type: DataTypes.STRING(64)
        }
    },
    {
        tableName: "codigos_recuperacao_senha",
        updatedAt: false
    }
);

export default CodigoRecuperacaoSenha;
