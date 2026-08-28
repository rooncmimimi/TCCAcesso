import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import { resolverUrlExibicao } from "../utils/supabaseStorage.js";
import { criarHooksCampoCifrado } from "../utils/campoCifrado.js";

const hooksCnpj = criarHooksCampoCifrado({
    campoPuro: "cnpj",
    campoCifrado: "cnpjCifrado",
    campoHash: "cnpjHash"
});

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

        // Mantido por compatibilidade com linhas antigas ainda não recifradas
        // (ver migrations 0029/0030) — gravações novas nunca preenchem este
        // campo em texto puro (ver hooks no fim do arquivo). A obrigatoriedade
        // do CNPJ no cadastro é garantida na validação da aplicação, não mais
        // pela coluna do banco.
        cnpj: {
            type: DataTypes.STRING(14),
            allowNull: true,
            unique: true,
            validate: {
                is: /^\d{14}$/
            }
        },

        cnpjCifrado: {
            field: "cnpj_cifrado",
            type: DataTypes.TEXT
        },

        cnpjHash: {
            field: "cnpj_hash",
            type: DataTypes.STRING(64),
            unique: true
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
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("logo"));
            }
        },

        empresaVerificada: {
            field: "empresa_verificada",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
,

        statusAprovacao: {
            field: "status_aprovacao",
            type: DataTypes.ENUM("pendente", "aprovada", "reprovada", "suspensa"),
            allowNull: false,
            defaultValue: "pendente"
        },

        capa: {
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("capa"));
            }
        },

        culturaInclusiva: {
            field: "cultura_inclusiva",
            type: DataTypes.TEXT
        },

        motivoReprovacao: {
            field: "motivo_reprovacao",
            type: DataTypes.TEXT
        },

        avaliadoEm: {
            field: "avaliado_em",
            type: DataTypes.DATE
        },

        avaliadoPor: {
            field: "avaliado_por",
            type: DataTypes.UUID
        },

        // Suspensão administrativa (Fase 10 / Fase G) — deliberadamente
        // separada de avaliadoPor/avaliadoEm/motivoReprovacao, que
        // continuam representando exclusivamente a avaliação cadastral
        // inicial da empresa (aprovação/reprovação).
        suspensoPor: {
            field: "suspenso_por",
            type: DataTypes.UUID
        },

        suspensoEm: {
            field: "suspenso_em",
            type: DataTypes.DATE
        },

        motivoSuspensao: {
            field: "motivo_suspensao",
            type: DataTypes.TEXT
        }
    },
    {
        tableName: "empresas",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        hooks: {
            beforeSave: hooksCnpj.beforeSave,
            afterSave: hooksCnpj.afterSave,
            afterFind: hooksCnpj.afterFind
        }
    }
);

export default Empresa;
