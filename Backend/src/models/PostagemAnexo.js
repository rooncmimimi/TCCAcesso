import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: postagem_anexos (migration 0005)
 */
const PostagemAnexo = sequelize.define(
    "PostagemAnexo",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        postagemId: {
            field: "postagem_id",
            type: DataTypes.UUID,
            allowNull: false
        },
        tipo: {
            type: DataTypes.ENUM("imagem", "documento"),
            allowNull: false
        },
        url: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        nomeOriginal: {
            field: "nome_original",
            type: DataTypes.STRING(255)
        },
        mimeType: {
            field: "mime_type",
            type: DataTypes.STRING(120)
        },
        tamanhoBytes: {
            field: "tamanho_bytes",
            type: DataTypes.BIGINT
        },
        ordem: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: "postagem_anexos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default PostagemAnexo;
