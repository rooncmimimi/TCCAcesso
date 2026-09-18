import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `conversas`: uma conversa privada entre dois usuários. O par fica sempre em ordem canônica
 * (`usuarioAId < usuarioBId`), então cada dupla tem uma única conversa.
 */
const Conversa = sequelize.define(
    "Conversa",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // Fica nulo quando aquele participante exclui a conta: o histórico continua visível para o
        // outro lado, só não aceita mensagem nova (veja `ConversaService.enviarMensagem` e, no Site,
        // `components/mensagens/utils.ts`, que mostra "Usuário removido").
        usuarioAId: {
            type: DataTypes.UUID
        },

        usuarioBId: {
            type: DataTypes.UUID
        },

        // Atualizados a cada mensagem, na mesma transação do envio: ordenam a lista de conversas e
        // dão a prévia mostrada nela.
        ultimaMensagemEm: {
            type: DataTypes.DATE
        },

        ultimaMensagemPrevia: {
            type: DataTypes.STRING(180)
        }
    },
    {
        tableName: "conversas"
    }
);

export default Conversa;
