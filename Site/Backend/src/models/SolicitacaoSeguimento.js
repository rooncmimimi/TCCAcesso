import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `solicitacoes_seguimento`: pedido para seguir um perfil privado,
 * diferente de `usuarios_seguidos` (seguimento já aprovado).
 *
 * Aceitar ou recusar sempre apaga a linha, sem gravar `status: "aceita"` ou `"recusada"`: depois de
 * aceita, o que importa já fica em `usuarios_seguidos`, e uma solicitação resolvida não tem valor
 * de histórico (ao contrário de `Denuncia`, que precisa de trilha de auditoria). A lógica fica no
 * `SeguidorService`.
 *
 * O índice único parcial `WHERE status = 'pendente'` (só no banco) impede duas solicitações
 * pendentes do mesmo par ao mesmo tempo; é ele a trava real contra corrida, não o código.
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
            type: DataTypes.UUID,
            allowNull: false
        },

        destinatarioId: {
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
        updatedAt: false
        }
);

export default SolicitacaoSeguimento;
