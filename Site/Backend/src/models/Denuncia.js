import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: denuncias (migration 0020)
 *
 * Estrutura polimórfica: entidade_id não tem FK real, porque pode
 * apontar para postagens, comentarios, usuarios, mensagens, vagas ou
 * empresas dependendo de entidade_tipo. A existência e a posse da
 * entidade são validadas em DenunciaService, não pelo banco.
 */
const Denuncia = sequelize.define(
    "Denuncia",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        // Migration 0036 (Fase 5): antes NOT NULL + ON DELETE CASCADE — se
        // o denunciante excluísse a própria conta, a denúncia inteira
        // desaparecia, mesmo já resolvida e mesmo contra outra pessoa.
        // Agora nullable + ON DELETE SET NULL (mesmo padrão de
        // `adminResponsavelId`, logo abaixo): a denúncia sobrevive à
        // exclusão do denunciante.
        denuncianteId: {
            field: "denunciante_id",
            type: DataTypes.UUID,
            allowNull: true
        },
        entidadeTipo: {
            field: "entidade_tipo",
            type: DataTypes.ENUM(
                "postagem",
                "comentario",
                "usuario",
                "mensagem",
                "vaga",
                "empresa"
            ),
            allowNull: false
        },
        entidadeId: {
            field: "entidade_id",
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
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM(
                "pendente",
                "em_analise",
                "resolvida",
                "rejeitada",
                "arquivada"
            ),
            allowNull: false,
            defaultValue: "pendente"
        },
        adminResponsavelId: {
            field: "admin_responsavel_id",
            type: DataTypes.UUID,
            allowNull: true
        },
        observacaoAdmin: {
            field: "observacao_admin",
            type: DataTypes.TEXT,
            allowNull: true
        },
        resolvidoEm: {
            field: "resolvido_em",
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: "denuncias",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Denuncia;
