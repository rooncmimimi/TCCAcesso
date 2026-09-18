import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Valores do enum `tipo_notificacao`. O Sequelize valida contra esta lista antes de gravar, então
 * um tipo que exista no banco e falte aqui faria a notificação falhar em silêncio (o try/catch de
 * `NotificacaoService.criar` engole o erro).
 */
export const TIPOS_NOTIFICACAO = [
    "sistema",
    "mensagem",
    "vaga",
    "candidatura",
    "feed",
    "moderacao"
];

/** Tabela `notificacoes`: o que aparece no sino do site e do app. */
const Notificacao = sequelize.define(
    "Notificacao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        tipo: {
            type: DataTypes.ENUM(...TIPOS_NOTIFICACAO),
            allowNull: false
        },

        // Texto livre em vez de enum, para um caso novo (como "resposta_comentario") não exigir
        // migration. Decide o ícone e o destino do toque.
        subtipo: {
            type: DataTypes.STRING(50)
        },

        titulo: {
            type: DataTypes.STRING(200),
            allowNull: false
        },

        descricao: {
            type: DataTypes.TEXT
        },

        lida: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        // Referência polimórfica, sem chave estrangeira: aponta para o que a notificação é sobre
        // (postagem, vaga, conversa...). A existência é conferida pela aplicação, nunca pelo banco.
        entidadeTipo: {
            type: DataTypes.STRING(30)
        },

        entidadeId: {
            type: DataTypes.UUID
        },

        // Quem praticou a ação. Vira nulo se a conta for excluída: a notificação sobrevive, só perde
        // avatar e link.
        atorId: {
            type: DataTypes.UUID
        }
    },
    {
        tableName: "notificacoes"
    }
);

export default Notificacao;
