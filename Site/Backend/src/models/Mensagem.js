import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: mensagens
 */
const Mensagem = sequelize.define(
    "Mensagem",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        conversaId: {
            field: "conversa_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        // Fase 8 (migration 0040, pendente de execução): nullable — ver
        // comentário equivalente em `models/Conversa.js`. Uma mensagem
        // cujo remetente excluiu a conta permanece visível (histórico
        // preservado), só com o remetente resolvido como "Usuário
        // removido" no frontend.
        remetenteId: {
            field: "remetente_id",
            type: DataTypes.UUID,
            allowNull: true
        },

        conteudo: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        lida: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
,

        lidaEm: {
            field: "lida_em",
            type: DataTypes.DATE
        }
    },
    {
        tableName: "mensagens",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Mensagem;
