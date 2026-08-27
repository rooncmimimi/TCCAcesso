import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import { resolverUrlExibicao } from "../utils/supabaseStorage.js";

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
        imagem: {
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("imagem"));
            }
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
