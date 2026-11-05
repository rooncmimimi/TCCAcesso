import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `perfis_adaptacao`: as adaptações profissionais da pessoa candidata (um perfil por candidato).
 *
 * PRIVADO. Nenhuma rota de terceiros lê esta tabela: só a própria pessoa (`MinhaAcessibilidadeService`).
 * O que uma empresa vê vem de `candidatura_adaptacoes`, uma cópia que a pessoa autoriza candidatura
 * por candidatura. Não guarda diagnóstico: `adaptacoes` são chaves de uma lista fechada
 * (`utils/adaptacoes.js`).
 */
const PerfilAdaptacao = sequelize.define(
    "PerfilAdaptacao",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        candidatoId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true
        },

        adaptacoes: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: false,
            defaultValue: []
        },

        observacao: {
            type: DataTypes.STRING(500)
        }
    },
    {
        tableName: "perfis_adaptacao"
    }
);

export default PerfilAdaptacao;
