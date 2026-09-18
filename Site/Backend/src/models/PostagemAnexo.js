import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `postagem_anexos`: as imagens e vídeos de uma publicação.
 *
 * `url` guarda o caminho no bucket privado (como `postagens/<usuarioId>/<uuid>.mp4`), nunca a URL
 * de exibição, e não tem getter. Assinar a URL é sempre um passo explícito do serviço
 * (`assinarMidiaDasPostagens`, em `PostagemService.js`), feito depois de `garantirAcessoAPostagem`
 * aprovar. Ler `.url` direto devolve o caminho cru, que sozinho não abre o arquivo.
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
            type: DataTypes.UUID,
            allowNull: false
        },

        tipo: {
            type: DataTypes.ENUM("imagem", "documento", "video"),
            allowNull: false
        },

        url: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        nomeOriginal: {
            type: DataTypes.STRING(255)
        },

        tipoMime: {
            type: DataTypes.STRING(120)
        },

        tamanhoBytes: {
            type: DataTypes.BIGINT
        },

        // Descrição acessível escrita pela pessoa que publicou: vira o `alt` da imagem e é lida pelo
        // sistema de voz. Nunca é preenchida automaticamente.
        descricao: {
            type: DataTypes.STRING(500)
        },

        ordem: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: "postagem_anexos"
    }
);

export default PostagemAnexo;
