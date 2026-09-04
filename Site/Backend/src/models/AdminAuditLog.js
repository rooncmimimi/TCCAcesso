import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: admin_audit_logs (migration 0021)
 *
 * Registro imutável de ações administrativas: sem updated_at e sem
 * qualquer endpoint de edição/exclusão na aplicação.
 */
const AdminAuditLog = sequelize.define(
    "AdminAuditLog",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        // ON DELETE SET NULL na FK (migration 0021): o log precisa
        // continuar legível mesmo depois que a conta do admin que agiu
        // for excluída — perder o registro junto com a conta destruiria
        // justamente o histórico que a auditoria existe para preservar.
        adminId: {
            field: "admin_id",
            type: DataTypes.UUID,
            allowNull: true
        },
        acao: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        entidadeTipo: {
            field: "entidade_tipo",
            type: DataTypes.STRING(30),
            allowNull: true
        },
        entidadeId: {
            field: "entidade_id",
            type: DataTypes.UUID,
            allowNull: true
        },
        descricao: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        ip: {
            type: DataTypes.STRING(64),
            allowNull: true
        },
        userAgent: {
            field: "user_agent",
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        tableName: "admin_audit_logs",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default AdminAuditLog;
