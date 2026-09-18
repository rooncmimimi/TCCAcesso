import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Tabela `postagens`: as publicações do feed. */
const Postagem = sequelize.define(
    "Postagem",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        conteudo: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        // Visível para quem ainda não entrou na conta, na página inicial pública.
        publica: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        // Exclusão lógica: a publicação removida some das listas, mas continua no banco para as
        // denúncias e o log de moderação.
        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        editadoEm: {
            type: DataTypes.DATE
        }
    },
    {
        tableName: "postagens"
    }
);

export default Postagem;
