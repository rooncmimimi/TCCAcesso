import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Tabela `vagas`: as vagas publicadas pelas empresas. */
const Vaga = sequelize.define(
    "Vaga",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        empresaId: {
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
            type: DataTypes.ENUM("presencial", "hibrido", "remoto")
        },

        contrato: {
            type: DataTypes.ENUM("clt", "pj", "estagio", "jovem_aprendiz", "temporario")
        },

        cidade: {
            type: DataTypes.STRING(100)
        },

        estado: {
            type: DataTypes.STRING(2)
        },

        cargaHoraria: {
            type: DataTypes.STRING(50)
        },

        // Quem a vaga procura. É a única fonte para "exclusiva para PCD": o filtro `exclusivaPcd`
        // da API vira `publicoAlvo IN ('pcd', 'pcd_cinquenta_mais')`.
        publicoAlvo: {
            type: DataTypes.ENUM("geral", "pcd", "cinquenta_mais", "pcd_cinquenta_mais"),
            allowNull: false,
            defaultValue: "geral"
        },

        acessibilidade: {
            type: DataTypes.TEXT
        },

        recursosAcessibilidade: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: false,
            defaultValue: []
        },

        status: {
            type: DataTypes.ENUM("aberta", "pausada", "encerrada"),
            allowNull: false,
            defaultValue: "aberta"
        },

        oculta: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        dataEncerramento: {
            type: DataTypes.DATEONLY
        }
    },
    {
        tableName: "vagas"
    }
);

export default Vaga;
