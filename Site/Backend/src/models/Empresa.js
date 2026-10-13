import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import { resolverUrlExibicao } from "../utils/supabaseStorage.js";
import { criarHooksCampoCifrado } from "../utils/campoCifrado.js";

const hooksCnpj = criarHooksCampoCifrado({
    campoPuro: "cnpj",
    campoCifrado: "cnpjCifrado",
    campoHash: "cnpjHash"
});

/** Tabela `empresas`: o perfil de empresa de uma conta, com a aprovação feita pela moderação. */
const Empresa = sequelize.define(
    "Empresa",
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

        razaoSocial: {
            type: DataTypes.STRING(200),
            allowNull: false
        },

        nomeFantasia: {
            type: DataTypes.STRING(200)
        },

        // Campo virtual, como o CPF do candidato: o banco guarda só `cnpj_cifrado` e `cnpj_hash`,
        // e os hooks de `campoCifrado.js` cuidam da conversão nos dois sentidos.
        cnpj: {
            type: DataTypes.VIRTUAL(DataTypes.STRING(14)),
            validate: {
                is: /^\d{14}$/
            }
        },

        cnpjCifrado: {
            type: DataTypes.TEXT
        },

        cnpjHash: {
            type: DataTypes.STRING(64),
            unique: true
        },

        descricao: {
            type: DataTypes.TEXT
        },

        culturaInclusiva: {
            type: DataTypes.TEXT
        },

        setor: {
            type: DataTypes.STRING(120)
        },

        porte: {
            type: DataTypes.ENUM("mei", "micro", "pequena", "media", "grande")
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

        // Conta de **candidato** de quem cadastrou a empresa. Diferente de `usuarioId`, que é o
        // login institucional: são dois papéis distintos da mesma pessoa, em contas separadas.
        // Preenchido a partir da sessão de quem cria, nunca do corpo da requisição.
        usuarioCandidatoId: {
            type: DataTypes.UUID
        },

        // ISO 3166-1 alpha-2 maiúsculo, pelo mesmo motivo de `Candidato.pais`: o código não muda
        // com o idioma da interface, então a tela exibe o nome do país no idioma que quiser.
        pais: {
            type: DataTypes.CHAR(2),
            validate: {
                is: /^[A-Z]{2}$/
            }
        },

        logo: {
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("logo"));
            }
        },

        capa: {
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("capa"));
            }
        },

        empresaVerificada: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        statusAprovacao: {
            type: DataTypes.ENUM("pendente", "aprovada", "reprovada", "suspensa"),
            allowNull: false,
            defaultValue: "pendente"
        },

        motivoReprovacao: {
            type: DataTypes.TEXT
        },

        avaliadoEm: {
            type: DataTypes.DATE
        },

        avaliadoPorId: {
            type: DataTypes.UUID
        },

        // Suspensão administrativa, separada de `avaliadoPorId`, `avaliadoEm` e `motivoReprovacao`,
        // que registram só a avaliação inicial do cadastro (aprovação ou reprovação).
        suspensoEm: {
            type: DataTypes.DATE
        },

        suspensoPorId: {
            type: DataTypes.UUID
        },

        motivoSuspensao: {
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "empresas",
        hooks: {
            beforeSave: hooksCnpj.beforeSave,
            afterSave: hooksCnpj.afterSave,
            afterFind: hooksCnpj.afterFind
        }
    }
);

export default Empresa;
