import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: arquivos (migration 0014)
 * Catálogo de todos os uploads da plataforma (auditoria/limpeza).
 *
 * `url` guarda a referência estável (caminho), sem getter automático:
 * ao contrário de fotoPerfil/capaPerfil/logo/etc., esta tabela mistura
 * registros de categorias PÚBLICAS (postagem) e PRIVADAS (curriculo,
 * certificado, documento) na mesma coluna — resolver automaticamente
 * aqui exigiria saber, por linha, qual bucket usar, e currículo/
 * certificado precisam de URL assinada (assíncrona), incompatível com
 * getter de Sequelize. Quem precisar exibir/baixar resolve explicitamente
 * (`resolverUrlExibicao` para categorias públicas, `gerarUrlAssinada`
 * para privadas), sabendo a categoria da linha.
 */
const Arquivo = sequelize.define(
    "Arquivo",
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
        categoria: {
            type: DataTypes.ENUM(
                "foto_perfil",
                "capa_perfil",
                "logo_empresa",
                "capa_empresa",
                "postagem",
                "curriculo",
                "certificado",
                "documento"
            ),
            allowNull: false
        },
        tipo: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "imagem"
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
        }
    },
    {
        tableName: "arquivos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false
    }
);

export default Arquivo;
