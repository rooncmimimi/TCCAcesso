import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Tabela `preferencias_notificacao`: categorias de notificação que o usuário aceita receber. */
const PreferenciaNotificacao = sequelize.define(
    "PreferenciaNotificacao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        vagasCandidaturas: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        mensagens: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        publicacoesComentarios: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        redeSeguidores: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "preferencias_notificacao"
    }
);

export default PreferenciaNotificacao;
