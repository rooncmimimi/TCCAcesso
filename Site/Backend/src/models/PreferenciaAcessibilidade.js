import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import env from "../config/env.js";

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
        },

        // Migration 0011 (`IDIOMA_NA_CONTA_HABILITADO`): o idioma do site. O Sequelize seleciona e insere TODAS as colunas do model, então
        // sem a migration aplicada declará-la sempre derrubaria as preferências de acessibilidade. Nulo: a conta ainda não escolheu.
        ...(env.idioma.naContaHabilitado
            ? {
                  idioma: {
                      type: DataTypes.STRING(5),
                      allowNull: true,
                      validate: { isIn: [["pt", "en", "es"]] }
                  }
              }
            : {}),

        // Migration 0014 (`VISUAL_NA_CONTA_HABILITADO`): a personalização visual para daltonismo.
        // Nulo significa "nunca personalizou", que é diferente de ter escolhido o padrão "nenhum" —
        // por isso não tem `defaultValue`. O conteúdo é limpo em `utils/visualDaConta.js` antes de
        // chegar aqui; o banco nunca vê o JSON como o cliente mandou.
        ...(env.visual.naContaHabilitado
            ? {
                  visual: {
                      type: DataTypes.JSONB,
                      allowNull: true
                  }
              }
            : {})
    },
    {
        tableName: "preferencias_acessibilidade"
    }
);

export default PreferenciaAcessibilidade;
