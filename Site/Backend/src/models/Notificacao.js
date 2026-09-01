import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: notificacoes
 * ENUM tipo_notificacao do banco.
 */
export const TIPOS_NOTIFICACAO = [
    "Sistema",
    "Mensagem",
    "Vaga",
    "Candidatura",
    "Feed",
    // Adicionado ao ENUM do banco na migration 0023, mas nunca tinha sido
    // refletido aqui — o Sequelize valida contra ESTE array antes de
    // tocar o banco, então toda notificação com tipo "Moderacao" (empresa
    // suspensa/reativada, denúncia analisada) falhava silenciosamente
    // (o try/catch de NotificacaoService.criar engolia o erro).
    "Moderacao"
];

const Notificacao = sequelize.define(
    "Notificacao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        tipo: {
            type: DataTypes.ENUM(...TIPOS_NOTIFICACAO),
            allowNull: false
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

        // Campos abaixo: migration 0033, todos opcionais/nullable — uma
        // notificação antiga (criada antes desta migration) simplesmente
        // não tem esses valores, e o frontend trata isso normalmente
        // (sem link/avatar, só o texto já congelado em titulo/descricao).

        // String livre (sem ENUM, mesmo padrão de admin_audit_logs.acao)
        // para granularidade de ícone/ação sem precisar de migration a
        // cada novo caso — ex.: "curtida_postagem", "resposta_comentario".
        subtipo: {
            type: DataTypes.STRING(50)
        },

        // Ponteiro polimórfico SEM FK real (mesmo padrão de
        // denuncias.entidade_id / admin_audit_logs.entidade_id) — aponta
        // para o que a notificação é sobre (postagem, vaga, conversa...).
        // Existência/posse são validadas na aplicação, nunca pelo banco.
        entidadeTipo: {
            field: "entidade_tipo",
            type: DataTypes.STRING(30)
        },

        entidadeId: {
            field: "entidade_id",
            type: DataTypes.UUID
        },

        // Quem praticou a ação — SET NULL se a conta do ator for excluída
        // depois (a notificação sobrevive, só perde avatar/link ao vivo).
        atorId: {
            field: "ator_id",
            type: DataTypes.UUID
        }
    },
    {
        tableName: "notificacoes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Notificacao;
