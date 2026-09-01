import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: conversas
 */
const Conversa = sequelize.define(
    "Conversa",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // Fase 8 (migration 0040, pendente de execução): nullable —
        // quando um participante exclui a conta, o banco põe este campo
        // em NULL (ON DELETE SET NULL) em vez de apagar a conversa
        // inteira (CASCADE, comportamento anterior). O outro participante
        // continua vendo o histórico; ver `ConversaService.enviarMensagem`
        // para o bloqueio de novas mensagens e
        // `components/mensagens/utils.ts` para o texto "Usuário removido"
        // no frontend. Até a migration rodar, a coluna no banco ainda é
        // NOT NULL — este campo só passa a aceitar `null` de verdade
        // depois da 0040.
        usuarioAId: {
            field: "usuario_a_id",
            type: DataTypes.UUID,
            allowNull: true
        },

        usuarioBId: {
            field: "usuario_b_id",
            type: DataTypes.UUID,
            allowNull: true
        },

        ultimaMensagem: {
            field: "ultima_mensagem",
            type: DataTypes.DATE
        }
,

        ultimaMensagemEm: {
            field: "ultima_mensagem_em",
            type: DataTypes.DATE
        },

        ultimaMensagemPrevia: {
            field: "ultima_mensagem_previa",
            type: DataTypes.STRING(180)
        }
    },
    {
        tableName: "conversas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
            {
                unique: true,
                fields: ["usuario_a_id", "usuario_b_id"]
            }
        ]
    }
);

export default Conversa;
