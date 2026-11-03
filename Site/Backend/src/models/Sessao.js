import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";
import env from "../config/env.js";

/**
 * Tabela `sessoes`: uma sessão de login por linha. Guarda só o hash do refresh token; cada
 * renovação revoga a linha atual e cria outra, ligada por `substituidaPorId` (veja `SessaoService`).
 */
const Sessao = sequelize.define(
    "Sessao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        usuarioId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        tokenHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },

        expiraEm: {
            type: DataTypes.DATE,
            allowNull: false
        },

        revogadaEm: {
            type: DataTypes.DATE
        },

        substituidaPorId: {
            type: DataTypes.UUID
        },

        userAgent: {
            type: DataTypes.STRING(255)
        },

        ip: {
            type: DataTypes.STRING(64)
        },

        // O Sequelize seleciona e insere TODAS as colunas do model. Sem a migration correspondente aplicada (o deploy só as aplica se o
        // Build Command do Render rodar `npm run migrate`), declará-las sempre derrubaria o login, o cadastro e a renovação de sessão com
        // "column does not exist", mesmo com o recurso desligado. Por isso as colunas de migrations posteriores à
        // 0001 só existem no model quando a chave do recurso delas está ligada (e a chave exige a migration).

        // Migration 0009 (Bloco 2, `SESSOES_DISPOSITIVOS_HABILITADO`): o login (família), o início dele e a última
        // renovação.
        ...(env.sessoes.dispositivosHabilitado
            ? {
                  familiaId: { type: DataTypes.UUID },
                  iniciadaEm: { type: DataTypes.DATE },
                  ultimoUsoEm: { type: DataTypes.DATE }
              }
            : {}),

        // Migration 0008 (`MFA_TOTP_HABILITADO`): quando a sessão passou pelo segundo fator (TOTP ou código de
        // recuperação). Vai junto na renovação do refresh token. Nulo = não passou.
        ...(env.mfa.habilitado
            ? {
                  mfaVerificadoEm: {
                      type: DataTypes.DATE
                  }
              }
            : {})
    },
    {
        tableName: "sessoes",
        updatedAt: false
    }
);

export default Sessao;
