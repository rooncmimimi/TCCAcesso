import http from "node:http";

import app from "./app.js";
import env from "./config/env.js";
import conectarBanco from "./config/sequelize.js";
import sequelize from "./config/bancoDeDados.js";
import {
    avisoDaMigracaoContaSemSenha,
    avisoDaMigracaoIdioma,
    avisoDaMigracaoSeguranca,
    avisoDaMigracaoSessoes,
    avisosDaSeguranca
} from "./config/avisosDeAmbiente.js";
import DispositivoConfiavelService from "./services/DispositivoConfiavelService.js";
import EmailService from "./services/EmailService.js";
import SessaoService from "./services/SessaoService.js";
import { iniciarSocket } from "./realtime/socket.js";
import { storageHabilitado } from "./utils/supabaseStorage.js";

/**
 * Bootstrap do servidor com desligamento gracioso.
 *
 * O Express é montado sobre um servidor HTTP explícito para que o
 * Socket.IO possa compartilhar a mesma porta (tempo real de mensagens,
 * notificações e feed).
 */
async function iniciarServidor() {
    await conectarBanco();

    // Com a criação de conta sem senha ligada, confere (sem alterar nada) se a migration 0007 foi
    // aplicada; sem ela, cada conta criada pelo Google falharia no banco.
    const avisoDaMigracao = await avisoDaMigracaoContaSemSenha({
        habilitado: env.google.contaSemSenha,
        consultar: async () => {
            const [linha] = await sequelize.query(
                "SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'senha_hash'",
                { type: "SELECT" }
            );

            return linha?.is_nullable ?? null;
        }
    });
    if (avisoDaMigracao) console.error(avisoDaMigracao);

    // Sessões e dispositivos (migration 0009): mesma conferência.
    const avisoDasSessoes = await avisoDaMigracaoSessoes({
        habilitado: env.sessoes.dispositivosHabilitado,
        consultar: async () => {
            const colunas = await sequelize.query(
                "SELECT 'sessoes.' || column_name AS item FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessoes' AND column_name IN ('familia_id', 'iniciada_em', 'ultimo_uso_em')",
                { type: "SELECT" }
            );

            return colunas.map((linha) => linha.item);
        }
    });
    if (avisoDasSessoes) console.error(avisoDasSessoes);

    // Idioma na conta (migration 0011): mesma conferência.
    const avisoDoIdioma = await avisoDaMigracaoIdioma({
        habilitado: env.idioma.naContaHabilitado,
        consultar: async () => {
            const colunas = await sequelize.query(
                "SELECT 'preferencias_acessibilidade.' || column_name AS item FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'preferencias_acessibilidade' AND column_name = 'idioma'",
                { type: "SELECT" }
            );

            return colunas.map((linha) => linha.item);
        }
    });
    if (avisoDoIdioma) console.error(avisoDoIdioma);

    // Verificação de dispositivo novo e conta comprometida (migration 0010): mesma conferência, mais o aviso de e-mail ausente.
    const avisoDaSeguranca = await avisoDaMigracaoSeguranca({
        habilitado: env.seguranca.dispositivosHabilitado,
        consultar: async () => {
            const tabelas = await sequelize.query(
                "SELECT tablename AS nome FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('dispositivos_confiaveis', 'desafios_de_dispositivo', 'links_de_seguranca', 'eventos_de_seguranca')",
                { type: "SELECT" }
            );

            return tabelas.map((linha) => linha.nome);
        }
    });
    if (avisoDaSeguranca) console.error(avisoDaSeguranca);
    for (const aviso of avisosDaSeguranca({ seguranca: env.seguranca, emailDisponivel: EmailService.disponivel() })) console.error(aviso);

    // Limpeza das sessões antigas: cada renovação cria uma linha, e antes nada as apagava. Roda ao iniciar e a cada
    // 6 horas; uma falha só é registrada, nunca derruba o servidor.
    const limparSessoes = async () => {
        try {
            const apagadas = await SessaoService.limparAntigas();
            if (apagadas > 0) console.log(`[SESSOES] ${apagadas} sessão(ões) antiga(s) apagada(s).`);

            if (DispositivoConfiavelService.habilitado()) {
                const antigos = await DispositivoConfiavelService.limparAntigos();
                const total = antigos.desafios + antigos.links + antigos.dispositivos;
                if (total > 0) console.log(`[SEGURANCA] ${total} registro(s) antigo(s) de segurança apagado(s).`);
            }
        } catch (erro) {
            console.error(`[SESSOES] Falha na limpeza de sessões antigas: ${erro.message}`);
        }
    };
    void limparSessoes();
    setInterval(limparSessoes, 6 * 60 * 60 * 1000).unref();

    // Nunca loga as credenciais, só o modo em uso, para deixar óbvio em
    // produção se o Storage persistente está realmente ativo ou se caiu
    // (não deveria, dado o fail-fast em env.js) no disco local efêmero.
    if (storageHabilitado) {
        console.log(
            `[STORAGE] Supabase Storage ativo (buckets: ${env.storage.publicBucket} / ${env.storage.privateBucket})`
        );
    } else {
        console.log("[STORAGE] Disco local ativo — desenvolvimento");
    }

    const server = http.createServer(app);

    const io = iniciarSocket(server);

    server.listen(env.port, () => {
        console.log(
            `[HTTP] Servidor ACESSO rodando em http://localhost:${env.port}/api (${env.nodeEnv})`
        );
        console.log("[WS] Socket.IO inicializado no mesmo servidor HTTP.");
    });

    const encerrar = (sinal) => () => {
        console.log(`[HTTP] Recebido ${sinal}. Encerrando servidor...`);

        io.close();
        server.close(() => process.exit(0));
    };

    process.on("SIGTERM", encerrar("SIGTERM"));
    process.on("SIGINT", encerrar("SIGINT"));

    process.on("unhandledRejection", (motivo) => {
        console.error("[FATAL] Promise rejeitada sem tratamento:", motivo);
    });
}

iniciarServidor();
