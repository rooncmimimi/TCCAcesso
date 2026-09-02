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
        // Fase 9, Bloco 8: a intenção final é NULL = ainda não respondeu o
        // consentimento de voz, true/false = já respondeu — mas isso exige
        // a migration 0042 (relaxa a constraint NOT NULL/DEFAULT FALSE que
        // hoje torna esse terceiro estado impossível), AINDA NÃO EXECUTADA
        // (aguardando autorização explícita). `allowNull:false` +
        // `defaultValue:false` continuam aqui de propósito — testado ao
        // vivo que trocar para `true`/`null` ANTES da migration quebra o
        // `findOrCreate` de `obter()` (Sequelize tenta INSERT NULL contra
        // a coluna NOT NULL real → 500 em toda primeira leitura de
        // preferências de um usuário novo). Trocar os dois junto com a
        // migration, nunca antes.
        consentimentoVoz: {
            field: "consentimento_voz",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
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
