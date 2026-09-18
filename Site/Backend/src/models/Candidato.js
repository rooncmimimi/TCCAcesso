import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import { criarHooksCampoCifrado } from "../utils/campoCifrado.js";

const hooksCpf = criarHooksCampoCifrado({
    campoPuro: "cpf",
    campoCifrado: "cpfCifrado",
    campoHash: "cpfHash"
});

/**
 * Tabela `candidatos`: o perfil de candidato de uma conta.
 *
 * `curriculo` guarda o caminho no bucket privado e, de propósito, não tem getter de URL: currículo
 * nunca vira URL pública, só URL assinada e temporária, gerada sob demanda depois da autorização
 * (`CandidatoService.gerarUrlCurriculo` e `GET /candidatos/:id/curriculo`). Nunca serialize este
 * campo cru numa resposta genérica de candidato (veja `utils/candidatoPrivacidade.js`).
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
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        // Campo virtual: o banco só tem `cpf_cifrado` e `cpf_hash`. Os hooks de `campoCifrado.js`
        // cifram e decifram por baixo dos panos, então o resto do código continua lendo e gravando
        // `candidato.cpf` como texto. A unicidade vem do índice sobre o hash.
        cpf: {
            type: DataTypes.VIRTUAL(DataTypes.STRING(11)),
            validate: {
                is: /^\d{11}$/
            }
        },

        cpfCifrado: {
            type: DataTypes.TEXT
        },

        cpfHash: {
            type: DataTypes.STRING(64),
            unique: true
        },

        dataNascimento: {
            type: DataTypes.DATEONLY
        },

        genero: {
            type: DataTypes.STRING(40)
        },

        tituloProfissional: {
            type: DataTypes.STRING(150)
        },

        biografia: {
            type: DataTypes.TEXT
        },

        escolaridade: {
            type: DataTypes.STRING(120)
        },

        necessidadesAcessibilidade: {
            type: DataTypes.TEXT
        },

        curriculo: {
            type: DataTypes.TEXT
        },

        curriculoNome: {
            type: DataTypes.STRING(255)
        },

        curriculoAtualizadoEm: {
            type: DataTypes.DATE
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
            type: DataTypes.DECIMAL(10, 2)
        }
    },
    {
        tableName: "candidatos",
        hooks: {
            beforeSave: hooksCpf.beforeSave,
            afterSave: hooksCpf.afterSave,
            afterFind: hooksCpf.afterFind
        }
    }
);

export default Candidato;
