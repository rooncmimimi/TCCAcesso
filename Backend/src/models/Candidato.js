import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: candidatos
 */
const Candidato = sequelize.define(
    "Candidato",
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

        cpf: {
            type: DataTypes.STRING(11),
            allowNull: true,
            unique: true,
            validate: {
                is: /^\d{11}$/
            }
        },

        dataNascimento: {
            field: "data_nascimento",
            type: DataTypes.DATEONLY
        },

        genero: {
            type: DataTypes.STRING(40)
        },

        biografia: {
            type: DataTypes.TEXT
        },

        escolaridade: {
            type: DataTypes.STRING(120)
        },

        experiencia: {
            type: DataTypes.TEXT
        },

        habilidades: {
            type: DataTypes.TEXT
        },

        curriculo: {
            type: DataTypes.TEXT
        },

        linkedin: {
            type: DataTypes.STRING(255)
        },

        github: {
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

        disponibilidade: {
            type: DataTypes.STRING(100)
        },

        pretensaoSalarial: {
            field: "pretensao_salarial",
            type: DataTypes.DECIMAL(10, 2)
        }
,

        tituloProfissional: {
            field: "titulo_profissional",
            type: DataTypes.STRING(150)
        },

        necessidadesAcessibilidade: {
            field: "necessidades_acessibilidade",
            type: DataTypes.TEXT
        },

        curriculoNome: {
            field: "curriculo_nome",
            type: DataTypes.STRING(255)
        },

        curriculoAtualizadoEm: {
            field: "curriculo_atualizado_em",
            type: DataTypes.DATE
        }
    },
    {
        tableName: "candidatos",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default Candidato;
