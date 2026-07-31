import sequelize from "./database.js";

/**
 * Autentica a conexão com o banco durante o boot da aplicação.
 * Em caso de falha o processo é encerrado (fail-fast).
 */
const conectarBanco = async () => {
    try {
        await sequelize.authenticate();
        console.log("[DB] Banco conectado com sucesso.");
    } catch (erro) {
        console.error("[DB] Falha ao conectar no banco de dados.");
        console.error(erro.message);
        process.exit(1);
    }
};

export default conectarBanco;
