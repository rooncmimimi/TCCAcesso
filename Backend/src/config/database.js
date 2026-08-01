import { Sequelize } from "sequelize";
import env from "./env.js";

/**
 * Instância única do Sequelize.
 *
 * - `underscored: true` mapeia camelCase (JS) para snake_case (Postgres),
 *   mantendo compatibilidade com o schema do projeto ACESSO.
 * - Todas as queries são parametrizadas pelo Sequelize (prepared statements),
 *   o que protege contra SQL Injection (OWASP A03).
 */

console.log("HOST:", env.db.host);
console.log("USER:", env.db.user);
console.log("DATABASE:", env.db.name);
console.log("PASSWORD:", env.db.password);

const sequelize = new Sequelize(
    env.db.name,
    env.db.user,
    env.db.password,
    {
        host: env.db.host,
        port: env.db.port,
        dialect: "postgres",

        dialectOptions: env.db.ssl
            ? {
                  ssl: {
                      require: true,
                      // O Supabase usa certificado gerenciado; em produção
                      // com CA própria troque para `true` e informe o CA.
                      rejectUnauthorized: false
                  }
              }
            : {},

        logging: env.isProducao ? false : (msg) => console.debug(msg),

        define: {
            timestamps: true,
            underscored: true,
            createdAt: "created_at",
            updatedAt: "updated_at"
        },

        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

export default sequelize;
