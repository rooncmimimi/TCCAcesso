import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import { criarHooksCampoCifrado } from "../utils/campoCifrado.js";

const hooksCpf = criarHooksCampoCifrado({
    campoPuro: "cpf",
    campoCifrado: "cpfCifrado",
    campoHash: "cpfHash"
});

/**
 * Tabela: candidatos
 *
 * `curriculo` guarda a referência estável (caminho) no bucket PRIVADO —
 * de propósito, SEM getter automático de URL: currículo nunca deve virar
 * uma URL pública (getPublicUrl), só uma URL assinada e temporária,
 * gerada sob demanda e já autorizada (ver `CandidatoService.gerarUrlCurriculo`
 * e `GET /candidatos/:id/curriculo`). Nunca serializar este campo cru numa
 * resposta genérica de candidato — ver `utils/candidatoPrivacidade.js`.
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

        // Mantido por compatibilidade com linhas antigas ainda não recifradas
        // (ver migration 0029) — a partir desta versão, gravações novas nunca
        // preenchem este campo em texto puro (ver hooks no fim do arquivo).
        cpf: {
            type: DataTypes.STRING(11),
            allowNull: true,
            unique: true,
            validate: {
                is: /^\d{11}$/
            }
        },

        cpfCifrado: {
            field: "cpf_cifrado",
            type: DataTypes.TEXT
        },

        cpfHash: {
            field: "cpf_hash",
            type: DataTypes.STRING(64),
            unique: true
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
        updatedAt: "updated_at",
        hooks: {
            beforeSave: hooksCpf.beforeSave,
            afterSave: hooksCpf.afterSave,
            afterFind: hooksCpf.afterFind
        }
    }
);

export default Candidato;
