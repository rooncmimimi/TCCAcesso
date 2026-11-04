import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `eventos_de_seguranca`: o histórico de segurança de cada conta (dispositivo novo confirmado, dispositivo revogado,
 * conta protegida, senha alterada...). Nunca guarda segredo nem código. É da própria pessoa: só ela vê o dela.
 */
const EventoDeSeguranca = sequelize.define(
    "EventoDeSeguranca",
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        usuarioId: { type: DataTypes.UUID, allowNull: false },
        tipo: { type: DataTypes.STRING(50), allowNull: false },
        ip: { type: DataTypes.STRING(64) },
        userAgent: { type: DataTypes.STRING(255) },
        metadados: { type: DataTypes.JSONB }
    },
    { tableName: "eventos_de_seguranca", updatedAt: false }
);

export default EventoDeSeguranca;
