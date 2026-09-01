import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: postagem_anexos (migration 0005, "video" adicionado na 0026,
 * "privado" adicionado na 0039 — Fase 7).
 *
 * `url` guarda uma REFERÊNCIA ESTÁVEL (caminho relativo no bucket, ex.:
 * `postagens/<usuarioId>/<uuid>.mp4`), nunca a URL final de exibição —
 * isso não mudou. O que mudou na Fase 7: o atributo `url` NÃO tem mais
 * getter automático. Antes, qualquer leitura deste model resolvia
 * sozinha uma URL pública permanente (`resolverUrlExibicao`), sem
 * nenhuma checagem de autorização — exatamente o gap que a Fase 7
 * corrige. Agora, resolver uma URL de exibição é sempre um passo
 * EXPLÍCITO do service (`PostagemService.assinarAnexos`/equivalente),
 * feito só depois de `garantirAcessoAPostagem` já ter aprovado o
 * acesso. Ler `.url` diretamente devolve o caminho cru — inofensivo
 * mesmo se vazado, porque sozinho não abre o arquivo em nenhum bucket.
 *
 * `privado`: true quando o arquivo físico está no bucket PRIVADO
 * (todo upload novo, Fase 7 em diante); false para anexos antigos que
 * ainda estão no bucket público (nunca migrados automaticamente — ver
 * plano da Fase 7). Decide qual bucket consultar ao gerar a URL de
 * exibição — nunca inferido do formato do caminho.
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
            allowNull: false
        },
        privado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
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
