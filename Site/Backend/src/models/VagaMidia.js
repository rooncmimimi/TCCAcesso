import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `vaga_midias`: o vídeo da vaga em Libras (um por vaga), com a transcrição (obrigatória) e a
 * legenda WebVTT (opcional, guardada como texto). Nenhuma tradução automática para Libras.
 *
 * `videoCaminho` é o caminho no bucket privado, nunca uma URL: a URL é assinada, temporária e
 * resolvida sob demanda por `VagaMidiaService`.
 */
const VagaMidia = sequelize.define(
    "VagaMidia",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        vagaId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        tipo: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "video_libras"
        },

        videoCaminho: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        videoTipoMime: {
            type: DataTypes.STRING(20),
            allowNull: false
        },

        legendaVtt: {
            type: DataTypes.TEXT
        },

        transcricao: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        descricao: {
            type: DataTypes.STRING(300)
        }
    },
    {
        tableName: "vaga_midias"
    }
);

export default VagaMidia;
