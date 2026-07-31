import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: vagas
 */
const Vaga = sequelize.define(
    "Vaga",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        empresaId: {
            field: "empresa_id",
            type: DataTypes.UUID,
            allowNull: false
        },

        titulo: {
            type: DataTypes.STRING(200),
            allowNull: false
        },

        descricao: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        requisitos: {
            type: DataTypes.TEXT
        },

        beneficios: {
            type: DataTypes.TEXT
        },

        salario: {
            type: DataTypes.DECIMAL(10, 2)
        },

        modalidade: {
            type: DataTypes.ENUM("Presencial", "Hibrido", "Remoto")
        },

        contrato: {
            type: DataTypes.ENUM(
                "CLT",
                "PJ",
                "Estagio",
                "JovemAprendiz",
                "Temporario"
            )
        },

        cidade: {
            type: DataTypes.STRING(100)
        },

        estado: {
            type: DataTypes.STRING(2)
        },

        cargaHoraria: {
            field: "carga_horaria",
            type: DataTypes.STRING(50)
        },

        exclusivaPcd: {
            field: "exclusiva_pcd",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        acessibilidade: {
            type: DataTypes.TEXT
        },

        status: {
            type: DataTypes.ENUM("Aberta", "Pausada", "Encerrada"),
            allowNull: false,
            defaultValue: "Aberta"
        },

        dataPublicacao: {
            field: "data_publicacao",
            type: DataTypes.DATE
        },

        dataEncerramento: {
            field: "data_encerramento",
            type: DataTypes.DATEONLY
        }
    },
    {
        tableName: "vagas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Vaga;
