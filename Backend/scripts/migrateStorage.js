#!/usr/bin/env node
/**
 * Auditoria/migração de referências antigas de arquivo (`/uploads/...` ou
 * URL completa de antes desta arquitetura) para o Supabase Storage.
 *
 * REGRA DE OURO: nunca finge que um arquivo foi migrado. Se o registro
 * existe no banco mas o arquivo físico não existe (mais comum em produção,
 * porque o disco do Render é apagado a cada deploy/restart), o item é
 * marcado NAO_ENCONTRADO e o banco NÃO é alterado para aquele item.
 *
 * Uso:
 *   npm run migrate:storage -- --dry-run           (só relatório, não altera nada)
 *   npm run migrate:storage -- --dry-run --limit 5  (relatório, só analisa 5 itens)
 *   npm run migrate:storage                          (migra de verdade)
 *   npm run migrate:storage -- --limit 5             (migra só os 5 primeiros)
 *
 * Campos varridos: Usuario.fotoPerfil/capaPerfil (público), Empresa.logo/capa
 * (público), Candidato.curriculo (PRIVADO), PostagemAnexo.url (público),
 * Arquivo.url (público, exceto categoria curriculo/certificado/documento).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import env from "../src/config/env.js";
import { storageHabilitado, enviarArquivo } from "../src/utils/supabaseStorage.js";
import { Usuario, Empresa, Candidato, PostagemAnexo, Arquivo } from "../src/models/index.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limiteIdx = args.indexOf("--limit");
const limite = limiteIdx !== -1 ? Number(args[limiteIdx + 1]) : Infinity;

const uploadDir = path.resolve(process.cwd(), env.security.uploadDir);

const CATEGORIAS_PRIVADAS_ARQUIVO = new Set(["curriculo", "certificado", "documento"]);

function ehCaminhoLegado(valor) {
    return (
        typeof valor === "string" &&
        (valor.startsWith("/uploads/") || /^https?:\/\//i.test(valor))
    );
}

function nomeDoArquivoLegado(valor) {
    // /uploads/1234-uuid.ext  ou  https://.../1234-uuid.ext
    return path.basename(new URL(valor, "http://local").pathname);
}

function extensaoDe(nome) {
    return path.extname(nome) || "";
}

async function localizarArquivoFisico(nomeArquivo) {
    const caminhoLocal = path.join(uploadDir, nomeArquivo);
    try {
        const stat = await fs.promises.stat(caminhoLocal);
        return { existe: stat.isFile(), caminhoLocal };
    } catch {
        return { existe: false, caminhoLocal };
    }
}

const relatorio = {
    encontrados: 0,
    migrados: 0,
    naoEncontrados: 0,
    erros: 0,
    ignorados: 0,
    itens: []
};

async function processarCampo({ Model, campo, label, novaPasta, privado, filtroExtra }) {
    if (relatorio.itens.length >= limite) return;

    // `attributes` usa o nome do atributo JS (ex.: "fotoPerfil") — o
    // Sequelize já traduz para a coluna real (`field: "foto_perfil"`) e
    // devolve a chave do resultado com o mesmo nome de atributo, mesmo
    // com `raw: true`. Nunca usar o nome da coluna do banco aqui.
    const where = filtroExtra ? { ...filtroExtra } : {};
    const registros = await Model.findAll({ attributes: ["id", campo], raw: true, where: { ...where } });

    for (const registro of registros) {
        if (relatorio.itens.length >= limite) break;

        const valor = registro[campo];
        if (!ehCaminhoLegado(valor)) {
            continue; // já é caminho novo, ou vazio — nada a fazer
        }

        const item = { label, id: registro.id, valorAtual: valor, status: null, detalhe: "" };

        if (/^https?:\/\//i.test(valor) && !valor.startsWith("/uploads/")) {
            // URL completa de outro host que não seja o disco local — não há
            // arquivo local para reenviar; sinaliza para revisão manual em
            // vez de tentar adivinhar.
            item.status = "IGNORADO";
            item.detalhe = "URL completa (não é /uploads local) — requer revisão manual, não é um caminho de disco conhecido.";
            relatorio.ignorados++;
            relatorio.itens.push(item);
            continue;
        }

        const nomeArquivo = nomeDoArquivoLegado(valor);
        const { existe, caminhoLocal } = await localizarArquivoFisico(nomeArquivo);

        if (!existe) {
            item.status = "NAO_ENCONTRADO";
            item.detalhe = `Arquivo físico ausente em ${caminhoLocal} — provavelmente perdido no disco efêmero. Banco NÃO alterado.`;
            relatorio.naoEncontrados++;
            relatorio.itens.push(item);
            continue;
        }

        relatorio.encontrados++;
        item.status = "ENCONTRADO";

        const bucketDestino = privado ? env.storage.privateBucket : env.storage.publicBucket;
        item.bucketDestino = bucketDestino;

        if (dryRun) {
            item.detalhe = `Migrável para ${bucketDestino} (dry-run — nada foi alterado).`;
            relatorio.itens.push(item);
            continue;
        }

        if (!storageHabilitado) {
            item.status = "ERRO";
            item.detalhe = "Supabase Storage não está configurado neste ambiente — não é possível migrar de verdade aqui.";
            relatorio.erros++;
            relatorio.itens.push(item);
            continue;
        }

        try {
            const buffer = await fs.promises.readFile(caminhoLocal);
            const novoCaminho = `${novaPasta(registro)}/${crypto.randomUUID()}${extensaoDe(nomeArquivo)}`;

            await enviarArquivo(buffer, novoCaminho, "application/octet-stream", { privado });
            await Model.update({ [campo]: novoCaminho }, { where: { id: registro.id } });

            item.status = "MIGRADO";
            item.novoCaminho = novoCaminho;
            item.detalhe = `Enviado para ${bucketDestino}/${novoCaminho} e referência do banco atualizada.`;
            relatorio.migrados++;
        } catch (erro) {
            item.status = "ERRO";
            item.detalhe = erro.message;
            relatorio.erros++;
        }

        relatorio.itens.push(item);
    }
}

async function main() {
    console.log(`\n=== migrate:storage ${dryRun ? "(DRY-RUN)" : "(EXECUÇÃO REAL)"}${Number.isFinite(limite) ? ` — limite ${limite}` : ""} ===\n`);

    await processarCampo({
        Model: Usuario,
        campo: "fotoPerfil",
        label: "Usuario.fotoPerfil",
        privado: false,
        novaPasta: (r) => `perfis/${r.id}`
    });

    await processarCampo({
        Model: Usuario,
        campo: "capaPerfil",
        label: "Usuario.capaPerfil",
        privado: false,
        novaPasta: (r) => `perfis/${r.id}`
    });

    await processarCampo({
        Model: Empresa,
        campo: "logo",
        label: "Empresa.logo",
        privado: false,
        novaPasta: (r) => `empresas/${r.id}`
    });

    await processarCampo({
        Model: Empresa,
        campo: "capa",
        label: "Empresa.capa",
        privado: false,
        novaPasta: (r) => `empresas/${r.id}`
    });

    await processarCampo({
        Model: Candidato,
        campo: "curriculo",
        label: "Candidato.curriculo",
        privado: true,
        novaPasta: (r) => `curriculos/${r.id}`
    });

    await processarCampo({
        Model: PostagemAnexo,
        campo: "url",
        label: "PostagemAnexo.url",
        privado: false,
        novaPasta: (r) => `postagens/migrados`
    });

    // Arquivo: privacidade depende da categoria da própria linha.
    const arquivos = await Arquivo.findAll({ attributes: ["id", "url", "categoria"], raw: true });
    for (const registro of arquivos) {
        if (relatorio.itens.length >= limite) break;
        if (!ehCaminhoLegado(registro.url)) continue;

        await processarCampo({
            Model: Arquivo,
            campo: "url",
            label: "Arquivo.url",
            privado: CATEGORIAS_PRIVADAS_ARQUIVO.has(registro.categoria),
            novaPasta: () => "arquivos/migrados",
            filtroExtra: { id: registro.id }
        });
    }

    console.log("Bucket destino (público):", env.storage.publicBucket);
    console.log("Bucket destino (privado):", env.storage.privateBucket);
    console.log("");

    for (const item of relatorio.itens) {
        console.log(`[${item.status}] ${item.label} (id=${item.id})`);
        console.log(`  atual: ${item.valorAtual}`);
        if (item.novoCaminho) console.log(`  novo:  ${item.novoCaminho}`);
        console.log(`  ${item.detalhe}\n`);
    }

    console.log("=== RESUMO ===");
    console.table({
        Encontrados: relatorio.encontrados,
        Migrados: relatorio.migrados,
        "Não encontrados": relatorio.naoEncontrados,
        Erros: relatorio.erros,
        Ignorados: relatorio.ignorados
    });

    process.exit(relatorio.erros > 0 ? 1 : 0);
}

main().catch((erro) => {
    console.error("[migrate:storage] Falha inesperada:", erro);
    process.exit(1);
});
