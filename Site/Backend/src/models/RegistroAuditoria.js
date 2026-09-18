import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `registros_auditoria`: o histórico das ações administrativas. A aplicação só grava e lê;
 * não existe rota que edite ou apague um registro.
 */
const RegistroAuditoria = sequelize.define(
    "RegistroAuditoria",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // Vira nulo se a conta do administrador for excluída: perder o registro junto com a conta
        // destruiria justamente o histórico que a auditoria existe para guardar.
        administradorId: {
            type: DataTypes.UUID
        },

        acao: {
            type: DataTypes.STRING(50),
            allowNull: false
        },

        entidadeTipo: {
            type: DataTypes.STRING(30)
        },

        entidadeId: {
            type: DataTypes.UUID
        },

        descricao: {
            type: DataTypes.TEXT
        },

        // Detalhes da ação, como o motivo informado e um retrato do conteúdo antes da remoção.
        metadados: {
            type: DataTypes.JSONB
        },

        ip: {
            type: DataTypes.STRING(64)
        },

        userAgent: {
            type: DataTypes.STRING(255)
        }
    },
    {
        tableName: "registros_auditoria",
        updatedAt: false
    }
);

export default RegistroAuditoria;
