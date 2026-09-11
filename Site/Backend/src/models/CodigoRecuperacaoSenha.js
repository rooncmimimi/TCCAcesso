import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: codigos_recuperacao_senha (migration 0008; `tokenHash` — migration 0045)
 * Apenas o hash do código/token é persistido, nunca o valor em claro.
 *
 * `tokenHash` guarda o hash do token opaco de alta entropia (mecanismo
 * principal, entregue por link no e-mail); `codigoHash` guarda o hash do
 * código de 6 dígitos (fallback documentado, único mecanismo usado pelo
 * app mobile). Os dois convivem na MESMA linha — resgatar um invalida o
 * outro (ambos marcam `utilizadoEm`). `tokenHash` é `NULL` em linhas
 * anteriores à migration 0045.
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
        tokenHash: {
            field: "token_hash",
            type: DataTypes.STRING(255),
            allowNull: true
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
