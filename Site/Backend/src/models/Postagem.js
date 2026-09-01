import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: postagens
 */
const Postagem = sequelize.define(
    "Postagem",
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
        conteudo: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        // Cópia do caminho do primeiro anexo de imagem (ver
        // PostagemService.create) — campo legado, mantido por
        // compatibilidade. Fase 7: sem getter automático (mesmo motivo de
        // PostagemAnexo.url) — resolver a URL de exibição é sempre um
        // passo explícito do service, depois da autorização. A
        // privacidade deste caminho nunca é rastreada aqui: é sempre
        // igual à do anexo cujo `url` bate com este valor (mesmo array de
        // arquivos, mesma requisição — nunca diverge, ver PostagemService).
        imagem: {
            type: DataTypes.TEXT
        },
        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        publica: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        editadoEm: {
            field: "editado_em",
            type: DataTypes.DATE
        }
    },
    {
        tableName: "postagens",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Postagem;
