import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `links_de_seguranca`: os links de uso único dos e-mails "Acho que invadiram minha conta" (`comprometida`) e
 * "Não fui eu" (`nao_fui_eu`). Guarda só o hash do token, com prazo e a marca de uso.
 */
const LinkDeSeguranca = sequelize.define(
    "LinkDeSeguranca",
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        usuarioId: { type: DataTypes.UUID, allowNull: false },
        tipo: { type: DataTypes.STRING(20), allowNull: false },
        tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        expiraEm: { type: DataTypes.DATE, allowNull: false },
        utilizadoEm: { type: DataTypes.DATE },
        ip: { type: DataTypes.STRING(64) }
    },
    { tableName: "links_de_seguranca", updatedAt: false }
);

export default LinkDeSeguranca;
