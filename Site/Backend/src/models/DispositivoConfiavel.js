import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `dispositivos_confiaveis`: aparelhos que a pessoa marcou como de confiança depois de confirmar o código do e-mail.
 * Guarda só o hash do token que o Site mantém; vale até `expiraEm` e pode ser revogado (`revogadoEm`).
 */
const DispositivoConfiavel = sequelize.define(
    "DispositivoConfiavel",
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        usuarioId: { type: DataTypes.UUID, allowNull: false },
        tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        rotulo: { type: DataTypes.STRING(120) },
        ip: { type: DataTypes.STRING(64) },
        ultimoUsoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        expiraEm: { type: DataTypes.DATE, allowNull: false },
        revogadoEm: { type: DataTypes.DATE }
    },
    { tableName: "dispositivos_confiaveis", updatedAt: false }
);

export default DispositivoConfiavel;
