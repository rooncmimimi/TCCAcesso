import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: solicitacoes_seguimento (migration 0034)
 *
 * Solicitação de seguir um perfil PRIVADO — diferente de `usuarios_seguidos`
 * (seguimento já aprovado). Aceitar/recusar SEMPRE apaga a linha (nunca
 * grava `status: "aceita"/"recusada"` e deixa) — o estado durável que
 * importa depois de aceita já fica em `usuarios_seguidos`; uma solicitação
 * resolvida não tem valor de histórico (diferente de `Denuncia`, que
 * precisa de trilha de auditoria). Ver `SeguidorService` para a lógica.
 *
 * O índice único parcial `WHERE status = 'pendente'` (só no banco, não
 * espelhado aqui) garante que nunca existam duas solicitações pendentes
 * simultâneas do mesmo par — é a trava real contra corrida, não o código.
 */
const SolicitacaoSeguimento = sequelize.define(
    "SolicitacaoSeguimento",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        solicitanteId: {
            field: "solicitante_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        destinatarioId: {
            field: "destinatario_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM("pendente", "aceita", "recusada"),
            allowNull: false,
            defaultValue: "pendente"
        }
    },
    {
        tableName: "solicitacoes_seguimento",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default SolicitacaoSeguimento;
