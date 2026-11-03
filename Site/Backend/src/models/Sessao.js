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

        // Quando a sessão passou pelo segundo fator (TOTP ou código de recuperação). Vai junto na renovação
        // do refresh token. Nulo = não passou (conta sem TOTP, ou administrador que ainda vai configurar).
        //
        // **Só existe no model com `MFA_TOTP_HABILITADO` ligada.** O Sequelize seleciona e insere todas as colunas
        // do model; sem a migration 0008 aplicada (o deploy não a aplica), declará-la sempre derrubaria o login, o
        // cadastro e a renovação de sessão com "column does not exist", mesmo com o recurso desligado.
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
