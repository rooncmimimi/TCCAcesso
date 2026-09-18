import { DataTypes } from "sequelize";
import sequelize from "../config/bancoDeDados.js";

/**
 * Tabela `usuarios_bloqueados`: quem cada usuário bloqueou. Para a aplicação o bloqueio vale nos
 * dois sentidos (veja `BloqueioService.estaBloqueadoEntre`).
 */
const UsuarioBloqueado = sequelize.define(
    "UsuarioBloqueado",
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

        bloqueadoId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "usuarios_bloqueados",
        updatedAt: false
    }
);

export default UsuarioBloqueado;
