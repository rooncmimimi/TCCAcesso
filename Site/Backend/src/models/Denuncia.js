import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `denuncias`: a fila de moderação.
 *
 * `entidadeId` não tem chave estrangeira porque pode apontar para postagem, comentário, usuário,
 * mensagem, vaga ou empresa, conforme `entidadeTipo`. A existência e a posse da entidade são
 * conferidas no `DenunciaService`, não pelo banco.
 */
const Denuncia = sequelize.define(
    "Denuncia",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // Fica nulo se quem denunciou excluir a conta: a denúncia continua na fila e pode ser
        // resolvida, só não há ninguém para avisar do desfecho.
        denuncianteId: {
            type: DataTypes.UUID
        },

        entidadeTipo: {
            type: DataTypes.ENUM("postagem", "comentario", "usuario", "mensagem", "vaga", "empresa"),
            allowNull: false
        },

        entidadeId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        motivo: {
            type: DataTypes.ENUM(
                "spam",
                "conteudo_ofensivo",
                "discurso_odio",
                "assedio",
                "fraude",
                "informacao_falsa",
                "conteudo_inadequado",
                "outro"
            ),
            allowNull: false
        },

        descricao: {
            type: DataTypes.TEXT
        },

        status: {
            type: DataTypes.ENUM("pendente", "em_analise", "resolvida", "rejeitada", "arquivada"),
            allowNull: false,
            defaultValue: "pendente"
        },

        administradorResponsavelId: {
            type: DataTypes.UUID
        },

        observacaoAdministrador: {
            type: DataTypes.TEXT
        },

        resolvidoEm: {
            type: DataTypes.DATE
        }
    },
    {
        tableName: "denuncias"
    }
);

export default Denuncia;
