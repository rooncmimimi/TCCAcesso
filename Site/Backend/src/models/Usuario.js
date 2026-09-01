import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import { resolverUrlExibicao } from "../utils/supabaseStorage.js";

/**
 * Tabela: usuarios
 * ENUM tipo_usuario: candidato | empresa | administrador
 */
const Usuario = sequelize.define(
    "Usuario",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        nome: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: {
                len: [3, 150]
            }
        },

        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },

        senhaHash: {
            field: "senha_hash",
            type: DataTypes.STRING(255),
            allowNull: false
        },

        telefone: {
            type: DataTypes.STRING(20)
        },

        fotoPerfil: {
            field: "foto_perfil",
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("fotoPerfil"));
            }
        },

        capaPerfil: {
            field: "capa_perfil",
            type: DataTypes.TEXT,
            get() {
                return resolverUrlExibicao(this.getDataValue("capaPerfil"));
            }
        },

        bloqueado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        bloqueadoEm: {
            field: "bloqueado_em",
            type: DataTypes.DATE
        },

        motivoBloqueio: {
            field: "motivo_bloqueio",
            type: DataTypes.TEXT
        },

        tipoUsuario: {
            field: "tipo_usuario",
            type: DataTypes.ENUM("candidato", "empresa", "administrador"),
            allowNull: false
        },

        ativo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        ultimoLogin: {
            field: "ultimo_login",
            type: DataTypes.DATE
        },

        pausadoPeloUsuario: {
            field: "pausado_pelo_usuario",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        pausadoEm: {
            field: "pausado_em",
            type: DataTypes.DATE
        },

        perfilPublico: {
            field: "perfil_publico",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },

        // Migration 0032. DEFAULT true no banco para não afetar contas já
        // existentes — só cadastros novos (AuthService.registerCandidate/
        // registerCompany) gravam `false` explicitamente, exigindo
        // confirmação por e-mail antes do primeiro login.
        emailVerificado: {
            field: "email_verificado",
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: "usuarios",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        defaultScope: {
            attributes: {
                exclude: ["senhaHash"]
            }
        },
        scopes: {
            // Use Usuario.scope("comSenha") apenas no fluxo de login.
            comSenha: {
                attributes: {}
            }
        }
    }
);

export default Usuario;
