import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/** Tabela `preferencias_acessibilidade`: as preferências salvas na conta, uma linha por usuário. */
const PreferenciaAcessibilidade = sequelize.define(
    "PreferenciaAcessibilidade",
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

        tema: {
            type: DataTypes.ENUM("claro", "escuro", "sistema"),
            allowNull: false,
            defaultValue: "sistema"
        },

        altoContraste: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        fonteDislexia: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        escalaFonte: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 100,
            validate: { min: 80, max: 200 }
        },

        espacamentoTexto: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        reduzirAnimacoes: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        leituraPorVoz: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        // `null` significa que a pessoa ainda não respondeu ao pedido de consentimento de voz; `true`
        // ou `false` é a resposta. Sem `defaultValue`, o registro criado por `findOrCreate` em
        // `AcessibilidadeService.obter()` já nasce nesse estado inicial.
        consentimentoVoz: {
            type: DataTypes.BOOLEAN
        },

        velocidadeVoz: {
            type: DataTypes.DECIMAL(3, 1),
            allowNull: false,
            defaultValue: 1.0
        },

        linguagemSimplificada: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        libras: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        destaqueFoco: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "preferencias_acessibilidade"
    }
);

export default PreferenciaAcessibilidade;
