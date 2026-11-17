import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `traducoes`: a tradução já feita de um texto, guardada para não ser feita duas vezes.
 *
 * A chave de busca é `hash`, o sha256 de "origem|destino|texto" — e não o id da publicação. Com
 * isso não existe invalidação: editar o conteúdo muda o texto, muda o hash, e a linha antiga
 * simplesmente deixa de ser encontrada. O texto original **não** é guardado; para servir o cache
 * basta comparar hashes.
 *
 * Só entra aqui conteúdo PÚBLICO (publicação, comentário, vaga), que é o que o Site traduz. Ver
 * `migrations/0015_cache_de_traducao.sql`.
 */
const Traducao = sequelize.define(
    "Traducao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        hash: {
            type: DataTypes.CHAR(64),
            allowNull: false,
            unique: true
        },

        idiomaOrigem: {
            type: DataTypes.STRING(5),
            allowNull: false
        },

        idiomaDestino: {
            type: DataTypes.STRING(5),
            allowNull: false
        },

        texto: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        motor: {
            type: DataTypes.STRING(20),
            allowNull: false
        },

        /** Tamanho do original: é por aqui que se acompanha quanto da cota do mês foi gasto. */
        caracteres: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },

        /** Última vez que esta linha foi servida a alguém. */
        usadoEm: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "traducoes"
    }
);

export default Traducao;
