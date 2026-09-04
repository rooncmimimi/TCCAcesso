import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Tabela: preferencias_acessibilidade (migration 0010)
 */
const PreferenciaAcessibilidade = sequelize.define(
    "PreferenciaAcessibilidade",
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
        tema: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "sistema",
            validate: { isIn: [["claro", "escuro", "sistema"]] }
        },
        altoContraste: {
            field: "alto_contraste",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        fonteDislexia: {
            field: "fonte_dislexia",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        escalaFonte: {
            field: "escala_fonte",
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: 100,
            validate: { min: 80, max: 200 }
        },
        espacamentoTexto: {
            field: "espacamento_texto",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        reduzirAnimacoes: {
            field: "reduzir_animacoes",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        leituraPorVoz: {
            field: "leitura_por_voz",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        // Fase 9, Bloco 8: NULL = ainda não respondeu o consentimento de
        // voz, true/false = já respondeu (aceitou/recusou) — migration 0042
        // (relaxou a constraint NOT NULL/DEFAULT FALSE) já foi executada,
        // então o terceiro estado agora é representável de ponta a ponta.
        // `allowNull:true` sem `defaultValue`: um registro novo (via
        // `findOrCreate` em `AcessibilidadeService.obter()`) nasce com
        // `consentimentoVoz: null` — "ainda não respondeu" é o estado
        // inicial correto, nunca "recusou".
        consentimentoVoz: {
            field: "consentimento_voz",
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        velocidadeVoz: {
            field: "velocidade_voz",
            type: DataTypes.DECIMAL(3, 1),
            allowNull: false,
            defaultValue: 1.0
        },
        linguagemSimplificada: {
            field: "linguagem_simplificada",
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
            field: "destaque_foco",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "preferencias_acessibilidade",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);

export default PreferenciaAcessibilidade;
