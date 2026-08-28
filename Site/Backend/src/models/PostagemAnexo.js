import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import { resolverUrlExibicao } from "../utils/supabaseStorage.js";

/**
 * Tabela: postagem_anexos (migration 0005, "video" adicionado na 0026)
 *
 * `url` guarda uma REFERÊNCIA ESTÁVEL (caminho relativo no bucket, ex.:
 * `postagens/<usuarioId>/<uuid>.mp4`), nunca a URL pública final — a URL
 * de exibição é resolvida sob demanda pelo getter abaixo, o que também
 * preserva a leitura de registros antigos que já guardavam uma URL
 * completa (`https://...` ou `/uploads/...`), sem precisar migrar dado.
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
            type: DataTypes.ENUM("imagem", "documento", "video"),
            allowNull: false
        },
        url: {
            type: DataTypes.TEXT,
            allowNull: false,
            get() {
                return resolverUrlExibicao(this.getDataValue("url"));
            }
        },
        nomeOriginal: {
            field: "nome_original",
            type: DataTypes.STRING(255)
        },
        // Descrição acessível (texto alternativo) do anexo — migration
        // 0028. Fornecida pelo usuário; usada como `alt` real da imagem
        // e lida pelo sistema de voz. Nunca gerada automaticamente.
        descricao: {
            type: DataTypes.STRING(500)
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
