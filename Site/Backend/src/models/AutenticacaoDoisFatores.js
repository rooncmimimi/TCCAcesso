import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: autenticacao_dois_fatores (migration 0015)
 *
 * `segredoTotp` guarda o segredo TOTP (base32) já cifrado pela aplicação
 * (ver `utils/criptografia.js`) — nunca em texto puro no banco.
 */
const AutenticacaoDoisFatores = sequelize.define(
    "AutenticacaoDoisFatores",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },
        metodo: {
            type: DataTypes.ENUM("totp", "sms"),
            allowNull: false,
            defaultValue: "totp"
        },
        segredoTotp: {
            field: "segredo_totp",
            type: DataTypes.TEXT
        },
        ativado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        ativadoEm: {
            field: "ativado_em",
            type: DataTypes.DATE
        }
    },
    {
        tableName: "autenticacao_dois_fatores",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        defaultScope: {
            // O segredo cifrado nunca deve sair por engano num include comum.
            attributes: { exclude: ["segredoTotp"] }
        },
        scopes: {
            comSegredo: { attributes: {} }
        }
    }
);

export default AutenticacaoDoisFatores;
