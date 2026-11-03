/**
 * A conferência de implantação (`scripts/verificarImplantacao.js`), separada da entrada e saída para poder ser testada.
 *
 * Responde, **sem alterar nada**: quais migrations faltam neste banco, quais chaves de recurso estão ligadas sem a migration
 * delas (isso derruba login e rotas), e o que ainda falta configurar antes de ligar cada recurso.
 */

/**
 * Cada recurso protegido por chave, a migration que ele exige e o que mais precisa existir antes de ligá-lo. É a fonte
 * única desta relação: um teste confere que cada migration citada existe em `migrations/`.
 */
export const RECURSOS = [
    {
        chave: "GOOGLE_CONTA_SEM_SENHA",
        migration: "0007_conta_sem_senha.sql",
        descricao: "Criar a conta direto no retorno do Google, sem senha",
        exige: []
    },
    {
        chave: "MFA_TOTP_HABILITADO",
        migration: "0008_totp_e_mfa_na_sessao.sql",
        descricao: "Verificação em duas etapas (aplicativo autenticador)",
        exige: [{ variavel: "MFA_CHAVE_CIFRA", minimo: 32, motivo: "chave própria do segredo do TOTP (senão usa o JWT_SECRET)" }]
    },
    {
        chave: "SESSOES_DISPOSITIVOS_HABILITADO",
        migration: "0009_sessoes_e_dispositivos.sql",
        descricao: "Encerrar sessão na hora e datas verdadeiras dos dispositivos",
        exige: []
    }
];

const ligada = (ambiente, chave) => String(ambiente[chave] ?? "").trim().toLowerCase() === "true";

/**
 * @param {object} entrada
 * @param {string[]} entrada.arquivos      nomes dos arquivos de migrations/ (qualquer ordem)
 * @param {string[]} entrada.aplicadas     nomes já registrados em `migracoes_aplicadas`
 * @param {Record<string,string|undefined>} entrada.ambiente variáveis de ambiente do serviço
 * @param {boolean} [entrada.producao]
 */
export function avaliarImplantacao({ arquivos, aplicadas, ambiente, producao = false }) {
    const jaAplicadas = new Set(aplicadas);
    const pendentes = [...arquivos].sort((a, b) => a.localeCompare(b, "en")).filter((arquivo) => !jaAplicadas.has(arquivo));
    const itens = [];

    for (const arquivo of pendentes) {
        itens.push({ nivel: "info", texto: `Migration pendente: ${arquivo}` });
    }

    for (const recurso of RECURSOS) {
        const estaLigado = ligada(ambiente, recurso.chave);
        const migrationPendente = pendentes.includes(recurso.migration);

        if (estaLigado && migrationPendente) {
            itens.push({
                nivel: "erro",
                texto: `${recurso.chave} está LIGADA, mas a migration ${recurso.migration} NÃO foi aplicada: ${recurso.descricao} vai falhar no banco. Aplique a migration antes (npm run migrate) ou desligue a chave.`
            });
        }

        for (const exigencia of recurso.exige) {
            const valor = String(ambiente[exigencia.variavel] ?? "");

            if (estaLigado && producao && valor.length < exigencia.minimo) {
                itens.push({
                    nivel: "aviso",
                    texto: `${recurso.chave} está ligada em produção sem ${exigencia.variavel} (${exigencia.minimo}+ caracteres): ${exigencia.motivo}.`
                });
            }
        }

        if (!estaLigado && !migrationPendente) {
            itens.push({ nivel: "info", texto: `${recurso.chave}: migration já aplicada, recurso desligado. Pode ligar quando quiser.` });
        }

        if (!estaLigado && migrationPendente) {
            itens.push({ nivel: "info", texto: `${recurso.chave}: desligada, e a migration ${recurso.migration} ainda não foi aplicada. Para ligar: aplique a migration, depois ligue.` });
        }
    }

    return {
        pendentes,
        itens,
        bloqueios: itens.filter((item) => item.nivel === "erro").length,
        avisos: itens.filter((item) => item.nivel === "aviso").length,
        pronto: itens.every((item) => item.nivel !== "erro")
    };
}

/** Texto do relatório. Nunca imprime valor de variável: só o nome. */
export function formatarRelatorio(avaliacao) {
    const marca = { erro: "[ERRO]", aviso: "[AVISO]", info: "[ok]" };
    const linhas = avaliacao.itens.map((item) => `  ${marca[item.nivel]} ${item.texto}`);

    linhas.push(
        "",
        avaliacao.pronto
            ? `Resultado: sem bloqueios (${avaliacao.pendentes.length} migration(ões) pendente(s), ${avaliacao.avisos} aviso(s)).`
            : `Resultado: ${avaliacao.bloqueios} bloqueio(s). NÃO ligue as chaves acima antes de aplicar as migrations.`
    );

    return linhas.join("\n");
}
