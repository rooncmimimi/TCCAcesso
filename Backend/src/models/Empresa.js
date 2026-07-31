import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: empresas
 * ENUM porte_empresa: MEI | Micro | Pequena | Media | Grande
 */
const Empresa = sequelize.define(
    "Empresa",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            field: "usuario_id",
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        cnpj: {
            type: DataTypes.STRING(14),
            allowNull: false,
            unique: true,
            validate: {
                is: /^\d{14}$/
            }
        },

        razaoSocial: {
            field: "razao_social",
            type: DataTypes.STRING(200),
            allowNull: false
        },

        nomeFantasia: {
            field: "nome_fantasia",
            type: DataTypes.STRING(200)
        },

        descricao: {
            type: DataTypes.TEXT
        },

        setor: {
            type: DataTypes.STRING(120)
        },

        porte: {
            type: DataTypes.ENUM("MEI", "Micro", "Pequena", "Media", "Grande")
        },

        site: {
            type: DataTypes.STRING(255)
        },

        cidade: {
            type: DataTypes.STRING(100)
        },

        estado: {
            type: DataTypes.STRING(2)
        },

        endereco: {
            type: DataTypes.TEXT
        },

        cep: {
            type: DataTypes.STRING(8)
        },

        logo: {
            type: DataTypes.TEXT
        },

        empresaVerificada: {
            field: "empresa_verificada",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: "empresas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Empresa;
