import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `desafios_de_dispositivo`: um código de 6 dígitos enviado por e-mail ao entrar de um aparelho novo. Guarda só o HMAC
 * do código, com prazo, tentativas e reenvios; um novo envio invalida o anterior (`substituidoEm`).
 */
const DesafioDeDispositivo = sequelize.define(
    "DesafioDeDispositivo",
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        usuarioId: { type: DataTypes.UUID, allowNull: false },
        codigoHash: { type: DataTypes.STRING(64), allowNull: false },
        expiraEm: { type: DataTypes.DATE, allowNull: false },
        tentativas: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
        reenvios: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
        utilizadoEm: { type: DataTypes.DATE },
        substituidoEm: { type: DataTypes.DATE },
        ip: { type: DataTypes.STRING(64) },
        userAgent: { type: DataTypes.STRING(255) }
    },
    { tableName: "desafios_de_dispositivo", updatedAt: false }
);

export default DesafioDeDispositivo;
