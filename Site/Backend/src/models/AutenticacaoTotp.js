import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `autenticacao_totp`: a verificação em duas etapas (aplicativo autenticador) de uma conta.
 * Linha presente = TOTP ativo; o segredo ainda não confirmado nunca é gravado (veja `TotpService`).
 *
 * `segredoCifrado` é AES-256-GCM com a conta no contexto da cifra: copiar o valor de uma linha para
 * outra não o abre. O model nunca devolve o segredo em JSON (`toJSON` o omite).
 */
const AutenticacaoTotp = sequelize.define(
    "AutenticacaoTotp",
    {
        usuarioId: {
            type: DataTypes.UUID,
            primaryKey: true
        },

        segredoCifrado: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        ultimoPasso: {
            // bigint chega como texto do driver; é convertido em `TotpService`.
            type: DataTypes.BIGINT
        },

        tentativasFalhas: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 0
        },

        bloqueadoAte: {
            type: DataTypes.DATE
        },

        confirmadoEm: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "autenticacao_totp"
    }
);

AutenticacaoTotp.prototype.toJSON = function toJSON() {
    const dados = { ...this.get() };
    delete dados.segredoCifrado;

    return dados;
};

export default AutenticacaoTotp;
