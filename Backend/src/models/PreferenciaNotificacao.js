import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: preferencias_notificacao (migration 0017)
 */
const PreferenciaNotificacao = sequelize.define(
    "PreferenciaNotificacao",
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
        vagasCandidaturas: {
            field: "vagas_candidaturas",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        mensagens: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        publicacoesComentarios: {
            field: "publicacoes_comentarios",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        redeSeguidores: {
            field: "rede_seguidores",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "preferencias_notificacao",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default PreferenciaNotificacao;
