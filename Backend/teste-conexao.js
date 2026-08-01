import { Client } from "pg";

const client = new Client({
  host: "db.kyaaujooxzfxftqzfbst.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "Acesso@2026!Supa#Db26",
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();
  console.log("✅ Conectado com sucesso!");
  await client.end();
} catch (err) {
  console.error("ERRO:");
  console.error(err);
}