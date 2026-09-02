/**
 * Gerador do Relatório de Auditoria de Segurança — ACESSO (Fase 9).
 *
 * Ambiente isolado: depende só de puppeteer-core (já instalado localmente
 * nesta pasta, sem download de Chromium) apontando para o Microsoft Edge
 * já instalado no sistema. Não instala nada globalmente, não toca no
 * package.json do Backend/Frontend.
 *
 * Uso:
 *   node gerar-relatorio.mjs
 * (ou: npm run gerar, dentro de docs/security-audit/)
 *
 * Saída: docs/security-audit/relatorio-auditoria-seguranca.pdf
 */

import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROJETO,
  DATA_AUDITORIA,
  ESCOPO,
  NOTA_METODOLOGICA,
  ACHADOS,
  PONTOS_FORTES,
} from "./dados-achados.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PALETA = {
  critica: "#B91C1C",
  alta: "#EA580C",
  media: "#D97706",
  baixa: "#2563EB",
  informativa: "#6B7280",
  pontoForte: "#059669",
};

const LABEL_SEVERIDADE = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  informativa: "Informativa",
};

const CATEGORIAS = {
  1: "1. Banco sem tranca",
  2: "2. Permissão no navegador",
  3: "3. IDOR",
  4: "4. Chaves expostas",
  5: "5. Inputs sem tratamento (XSS)",
};

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

// ---------------------------------------------------------------- util ----

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function contarPorSeveridade(achados) {
  const base = { critica: 0, alta: 0, media: 0, baixa: 0, informativa: 0 };
  for (const a of achados) base[a.severidade]++;
  return base;
}

function contarPorCategoria(achados) {
  const base = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const a of achados) base[a.categoria]++;
  return base;
}

// ------------------------------------------------------------ gráficos ----

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    "M", startOuter.x, startOuter.y,
    "A", rOuter, rOuter, 0, largeArc, 0, endOuter.x, endOuter.y,
    "L", endInner.x, endInner.y,
    "A", rInner, rInner, 0, largeArc, 1, startInner.x, startInner.y,
    "Z",
  ].join(" ");
}

function svgDonutPorSeveridade(counts) {
  const ordem = ["critica", "alta", "media", "baixa", "informativa"];
  const total = ordem.reduce((s, k) => s + counts[k], 0);
  const cx = 110, cy = 110, rOuter = 100, rInner = 58;

  let anguloAtual = 0;
  let fatias = "";
  if (total === 0) {
    fatias = `<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="#E5E7EB" stroke-width="${rOuter - rInner}" />`;
  } else {
    for (const chave of ordem) {
      const qtd = counts[chave];
      if (qtd === 0) continue;
      const fatiaAngulo = (qtd / total) * 360;
      const fim = anguloAtual + fatiaAngulo;
      fatias += `<path d="${arcPath(cx, cy, rOuter, rInner, anguloAtual, fim)}" fill="${PALETA[chave]}" />`;
      anguloAtual = fim;
    }
  }

  const legenda = ordem
    .map(
      (chave) => `
      <div class="legenda-item">
        <span class="legenda-cor" style="background:${PALETA[chave]}"></span>
        <span class="legenda-label">${LABEL_SEVERIDADE[chave]}</span>
        <span class="legenda-valor">${counts[chave]}</span>
      </div>`
    )
    .join("");

  return `
  <div class="grafico-linha">
    <svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      ${fatias}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="30" font-weight="700" fill="#111827">${total}</text>
      <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="11" fill="#6B7280">achado${total === 1 ? "" : "s"}</text>
    </svg>
    <div class="legenda">${legenda}</div>
  </div>`;
}

function svgBarrasPorCategoria(counts) {
  const chaves = ["1", "2", "3", "4", "5"];
  const valores = chaves.map((c) => counts[c]);
  const max = Math.max(1, ...valores);
  const larguraBarra = 64;
  const espaco = 34;
  const alturaMax = 140;
  const baseY = 170;
  const largura = chaves.length * (larguraBarra + espaco) + espaco;

  let barras = "";
  chaves.forEach((c, i) => {
    const valor = counts[c];
    const altura = valor === 0 ? 2 : Math.max(6, (valor / max) * alturaMax);
    const x = espaco + i * (larguraBarra + espaco);
    const y = baseY - altura;
    const cor = valor === 0 ? "#D1D5DB" : "#2563EB";
    barras += `
      <rect x="${x}" y="${y}" width="${larguraBarra}" height="${altura}" rx="4" fill="${cor}" />
      <text x="${x + larguraBarra / 2}" y="${y - 8}" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">${valor}</text>
      <text x="${x + larguraBarra / 2}" y="${baseY + 22}" text-anchor="middle" font-size="13" font-weight="600" fill="#374151">${c}</text>`;
  });

  const legenda = chaves
    .map((c) => `<div class="legenda-cat"><strong>${c}</strong> — ${CATEGORIAS[c]}</div>`)
    .join("");

  return `
  <svg width="${largura}" height="200" viewBox="0 0 ${largura} 200" xmlns="http://www.w3.org/2000/svg">
    <line x1="${espaco - 10}" y1="${baseY}" x2="${largura - espaco + 10}" y2="${baseY}" stroke="#D1D5DB" stroke-width="1.5" />
    ${barras}
  </svg>
  <div class="legenda-categorias">${legenda}</div>`;
}

// -------------------------------------------------------------- seções ----

function renderCapa() {
  return `
  <section class="pagina capa">
    <div class="capa-topo">
      <div class="capa-selo">🔒 AUDITORIA DE SEGURANÇA</div>
    </div>
    <div class="capa-centro">
      <h1>Relatório de Auditoria<br/>de Segurança</h1>
      <h2>${escapeHtml(PROJETO)}</h2>
      <p class="capa-data">${escapeHtml(DATA_AUDITORIA)}</p>
    </div>
    <div class="capa-rodape">
      <h3>Escopo auditado</h3>
      <ul>${ESCOPO.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
      <h3>Nota metodológica</h3>
      <p class="capa-metodo-intro">
        Cada categoria pedida foi mapeada para o equivalente real desta stack
        (Node.js/Express/Sequelize/PostgreSQL/JWT no backend, React/TypeScript
        no frontend, deploy via Render sem Docker/CI) antes da verificação:
      </p>
      <table class="tabela-metodo">
        ${NOTA_METODOLOGICA.map(
          (m) => `<tr><td class="col-categoria">${escapeHtml(m.categoria)}</td><td>${escapeHtml(m.mapeamento)}</td></tr>`
        ).join("")}
      </table>
    </div>
  </section>`;
}

function renderResumoExecutivo(porSeveridade, porCategoria) {
  return `
  <section class="pagina">
    <h1 class="titulo-secao">Resumo executivo</h1>
    <p>
      Foram identificados <strong>${ACHADOS.length} achados</strong> nas cinco categorias
      solicitadas, todos verificados diretamente no código-fonte e, quando aplicável,
      confirmados por teste ao vivo via API antes de entrarem neste relatório. Não foram
      encontrados achados de severidade <strong>crítica</strong> ou <strong>alta</strong>.
      As categorias 2 (permissão definida só no navegador), 3 (IDOR) e 4 (chaves expostas)
      foram auditadas de forma exaustiva sem gerar nenhum achado adicional além dos listados
      — a extensa lista de "pontos fortes" a seguir documenta essa cobertura.
    </p>

    <div class="graficos-lado-a-lado">
      <div class="grafico-bloco">
        <h3>Achados por severidade</h3>
        ${svgDonutPorSeveridade(porSeveridade)}
      </div>
    </div>

    <div class="grafico-bloco grafico-bloco-largo">
      <h3>Achados por categoria</h3>
      ${svgBarrasPorCategoria(porCategoria)}
    </div>

    <table class="tabela-resumo">
      <thead><tr><th>Severidade</th><th>Quantidade</th></tr></thead>
      <tbody>
        ${Object.entries(porSeveridade)
          .map(
            ([chave, qtd]) => `
          <tr>
            <td><span class="chip" style="background:${PALETA[chave]}">${LABEL_SEVERIDADE[chave]}</span></td>
            <td>${qtd}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </section>`;
}

function renderPontosFortes() {
  return `
  <section class="pagina">
    <h1 class="titulo-secao">Pontos fortes verificados</h1>
    <p>
      Itens confirmados como corretamente implementados durante a auditoria — listados
      com evidência específica para demonstrar a abrangência real da verificação, não
      apenas a ausência de achados.
    </p>
    ${PONTOS_FORTES.map(
      (p) => `
      <div class="ponto-forte">
        <div class="ponto-forte-titulo"><span class="marca-forte">✓</span> ${escapeHtml(p.titulo)}</div>
        <div class="ponto-forte-evidencia">${escapeHtml(p.evidencia)}</div>
      </div>`
    ).join("")}
  </section>`;
}

function renderPontosFracos() {
  return `
  <section class="pagina">
    <h1 class="titulo-secao">Pontos fracos — riscos centrais</h1>
    <p>Síntese dos riscos reais identificados, detalhados achado a achado na seção seguinte.</p>
    <ul class="lista-fracos">
      <li><strong>Isolamento social incompleto num único ponto de listagem</strong> — a aba de
        compartilhamentos do perfil não aplica a mesma checagem de bloqueio que todo o resto
        do sistema já aplica corretamente (achado A1).</li>
      <li><strong>Caminho legado ainda ativo para seguir empresa</strong> — um endpoint já
        marcado como depreciado no próprio código continua contornando bloqueio (achado A2).</li>
      <li><strong>Superfície de upload sem uso funcional</strong> — duas rotas genéricas de
        upload, sem nenhum consumidor no frontend, aceitam arquivos sem vínculo a um recurso
        do usuário (achado A3).</li>
      <li><strong>Tokens de sessão em localStorage</strong> — gap de defesa em profundidade
        caso um XSS seja introduzido no futuro; não há XSS ativo hoje (achado A4).</li>
    </ul>
  </section>`;
}

function renderAchados() {
  const porCategoria = {};
  for (const a of ACHADOS) {
    porCategoria[a.categoria] = porCategoria[a.categoria] || [];
    porCategoria[a.categoria].push(a);
  }

  const secoes = Object.keys(CATEGORIAS)
    .map((catId) => {
      const lista = porCategoria[catId] || [];
      const tabelaLinhas = lista.length
        ? lista
            .map(
              (a) => `
        <tr>
          <td><span class="chip chip-tabela" style="background:${PALETA[a.severidade]}">${LABEL_SEVERIDADE[a.severidade]}</span></td>
          <td class="col-arquivo">${escapeHtml(a.arquivo)}<br/><span class="linhas">linhas ${escapeHtml(a.linhas)}</span></td>
          <td>${escapeHtml(a.titulo)}</td>
        </tr>`
            )
            .join("")
        : `<tr><td colspan="3" class="sem-achados">Nenhum achado adicional nesta categoria além do que já consta nos pontos fortes.</td></tr>`;

      const detalhes = lista
        .map(
          (a) => `
        <div class="achado" id="achado-${a.id}">
          <div class="achado-cabecalho">
            <span class="chip" style="background:${PALETA[a.severidade]}">${LABEL_SEVERIDADE[a.severidade]}</span>
            <span class="achado-id">${a.id}</span>
            <span class="achado-titulo">${escapeHtml(a.titulo)}</span>
          </div>
          <div class="achado-meta"><strong>Arquivo:</strong> ${escapeHtml(a.arquivo)} — linhas ${escapeHtml(a.linhas)}</div>
          <pre class="codigo"><code>${escapeHtml(a.trecho)}</code></pre>
          <div class="achado-campo"><strong>Descrição:</strong> ${escapeHtml(a.descricao)}</div>
          <div class="achado-campo"><strong>Por que é explorável:</strong> ${escapeHtml(a.exploracao)}</div>
          <div class="achado-campo"><strong>Evidência:</strong> ${escapeHtml(a.evidencia)}</div>
          <div class="achado-campo"><strong>Condições de exploração:</strong> ${escapeHtml(a.condicoes)}</div>
        </div>`
        )
        .join("");

      return `
      <section class="pagina">
        <h2 class="titulo-categoria">${escapeHtml(CATEGORIAS[catId])}</h2>
        <table class="tabela-achados">
          <thead><tr><th>Severidade</th><th>Arquivo:linha</th><th>Descrição</th></tr></thead>
          <tbody>${tabelaLinhas}</tbody>
        </table>
        ${detalhes}
      </section>`;
    })
    .join("");

  return `<h1 class="titulo-secao pagina-titulo-achados">Achados detalhados por categoria</h1>${secoes}`;
}

function renderRecomendacoes() {
  const grupos = [
    {
      titulo: "P1 — Corrigir no próximo ciclo (bypass de isolamento social já ativo)",
      itens: [
        {
          ref: "A1",
          texto:
            "Fazer CompartilhamentoService.listarPorUsuario reaproveitar garantirAcessoAPostagem/BloqueioService, igual a todo outro ponto de listagem social do sistema.",
        },
        {
          ref: "A2",
          texto:
            "Remover (ou, no mínimo, aplicar BloqueioService.estaBloqueadoEntre em) o endpoint depreciado POST /empresas/:id/seguir, já que não há nenhum consumidor no frontend hoje.",
        },
      ],
    },
    {
      titulo: "P2 — Reduzir superfície de ataque desnecessária",
      itens: [
        {
          ref: "A3",
          texto:
            "Remover as rotas POST /upload/imagem e POST /upload/anexos (sem consumidor) ou, se forem necessárias para uso futuro, escopá-las por usuário como toda outra rota de upload do projeto já faz.",
        },
      ],
    },
    {
      titulo: "P3 — Defesa em profundidade (sem urgência, sem achado ativo hoje)",
      itens: [
        {
          ref: "A4",
          texto:
            "Avaliar migrar o armazenamento dos tokens JWT de localStorage para cookies httpOnly+Secure+SameSite, como proteção adicional caso um XSS seja introduzido futuramente. Mudança arquitetural maior — não é uma correção pontual.",
        },
      ],
    },
  ];

  return `
  <section class="pagina">
    <h1 class="titulo-secao">Recomendações priorizadas</h1>
    ${grupos
      .map(
        (g) => `
      <div class="grupo-recomendacao">
        <h3>${escapeHtml(g.titulo)}</h3>
        <ol>
          ${g.itens.map((i) => `<li><strong>[${i.ref}]</strong> ${escapeHtml(i.texto)}</li>`).join("")}
        </ol>
      </div>`
      )
      .join("")}
  </section>`;
}

// --------------------------------------------------- issues do GitHub ----

function issueMarkdown(a, numero) {
  const labels =
    a.severidade === "critica" || a.severidade === "alta"
      ? `security, severidade:${a.severidade}, prioridade-alta`
      : `security, severidade:${a.severidade}`;

  return `--- ISSUE ${numero} ---
### Título
[Segurança] ${a.titulo}

### Labels sugeridas
${labels}

### Severidade
${LABEL_SEVERIDADE[a.severidade]}

### Descrição do problema
${a.descricao}

### Por que é explorável
${a.exploracao}

### Evidência
Arquivo: \`${a.arquivo}\` — linhas ${a.linhas}

\`\`\`js
${a.trecho}
\`\`\`

${a.evidencia}

### Condições de exploração
${a.condicoes}

### Correção sugerida
${sugestaoCorrecao(a)}

### Critérios de aceite
- [ ] Correção aplicada no arquivo/linhas indicados acima
- [ ] Teste automatizado ou script de verificação cobrindo o cenário de exploração descrito
- [ ] Regressão manual das funcionalidades relacionadas (listagem/seguir/upload conforme o caso)
- [ ] Nenhuma nova rota/consulta perde a checagem equivalente em outros pontos do sistema
--- FIM ISSUE ${numero} ---`;
}

function sugestaoCorrecao(a) {
  switch (a.id) {
    case "A1":
      return "Substituir a montagem manual de `wherePostagem[Op.or]` em `listarPorUsuario` por uma chamada a `garantirAcessoAPostagem` (ou ao mesmo filtro SQL que `PostagemService.findAll` já usa) antes de listar os compartilhamentos, garantindo que um bloqueio em qualquer direção resulte em lista vazia/403, igual ao restante do sistema.";
    case "A2":
      return "Remover a rota `POST /empresas/:id/seguir` e o método `InteracaoService.alternarSeguir` (já marcados como `@deprecated`, sem consumidor no frontend). Se por algum motivo precisar ser mantido temporariamente, aplicar `BloqueioService.estaBloqueadoEntre` antes de criar o registro em `EmpresaSeguida`, replicando a checagem que `SeguidorService.alternarEmpresa` já faz.";
    case "A3":
      return "Remover `POST /upload/imagem` e `POST /upload/anexos` de `uploadRoutes.js` caso não haja plano de uso; caso contrário, trocar `processarArmazenamento` por um processador com `pasta: (req) => \\`uploads/${req.user.id}\\`` (mesmo padrão de `processarDocumentoPrivado`, já existente no mesmo arquivo).";
    case "A4":
      return "Planejar (em uma fase própria, com testes de regressão de toda a autenticação) a migração dos tokens de acesso/renovação para cookies `httpOnly; Secure; SameSite=Strict`, ajustando `api.ts` e o middleware de autenticação do backend para ler o token do cookie em vez do header `Authorization`.";
    default:
      return "Ver descrição do achado.";
  }
}

function renderIssuesGithub() {
  const blocos = ACHADOS.map((a, i) => issueMarkdown(a, i + 1)).join("\n\n");
  return `
  <section class="pagina">
    <h1 class="titulo-secao">Issues para o GitHub</h1>
    <p>
      Texto pronto para copiar e colar na criação de cada issue no GitHub, um bloco por
      achado, delimitado por <code>--- ISSUE n ---</code> / <code>--- FIM ISSUE n ---</code>.
      Nenhum achado foi agrupado nesta rodada: os quatro tratam de arquivos, causas-raiz e
      correções suficientemente distintas para justificar issues separadas.
    </p>
    <pre class="issues-markdown">${escapeHtml(blocos)}</pre>
  </section>`;
}

// ---------------------------------------------------------------- CSS ----

const CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1F2937;
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }
  .pagina { page-break-after: always; }
  .pagina:last-child { page-break-after: auto; }
  h1, h2, h3 { color: #111827; margin: 0 0 10px; }
  .titulo-secao { font-size: 22px; border-bottom: 3px solid #2563EB; padding-bottom: 8px; margin-bottom: 16px; }
  .pagina-titulo-achados { page-break-before: always; }
  .titulo-categoria { font-size: 17px; color: #2563EB; margin-top: 4px; }
  p { margin: 0 0 12px; }

  /* Capa */
  .capa { display: flex; flex-direction: column; justify-content: space-between; min-height: 950px; }
  .capa-selo {
    display: inline-block; background: #EFF6FF; color: #2563EB; font-weight: 700;
    font-size: 12px; letter-spacing: 1px; padding: 6px 14px; border-radius: 20px;
  }
  .capa-centro { text-align: center; margin: 60px 0; }
  .capa-centro h1 { font-size: 34px; line-height: 1.25; }
  .capa-centro h2 { font-size: 24px; color: #2563EB; margin-top: 14px; }
  .capa-data { color: #6B7280; font-size: 14px; margin-top: 10px; }
  .capa-rodape h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin-top: 18px; }
  .capa-rodape ul { margin: 0 0 6px; padding-left: 18px; }
  .capa-rodape li { margin-bottom: 4px; font-size: 11px; }
  .capa-metodo-intro { font-size: 11px; color: #4B5563; }
  .tabela-metodo { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .tabela-metodo td { border-top: 1px solid #E5E7EB; padding: 5px 6px; vertical-align: top; }
  .tabela-metodo .col-categoria { width: 26%; font-weight: 700; color: #2563EB; }

  /* Resumo executivo */
  .graficos-lado-a-lado { display: flex; justify-content: center; margin: 12px 0 20px; }
  .grafico-bloco { text-align: center; }
  .grafico-bloco h3 { font-size: 14px; margin-bottom: 6px; }
  .grafico-bloco-largo { margin-top: 10px; }
  .grafico-linha { display: flex; align-items: center; gap: 24px; justify-content: center; }
  .legenda { display: flex; flex-direction: column; gap: 6px; text-align: left; }
  .legenda-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .legenda-cor { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
  .legenda-label { width: 80px; }
  .legenda-valor { font-weight: 700; }
  .legenda-categorias { display: flex; flex-wrap: wrap; gap: 4px 18px; justify-content: center; font-size: 10.5px; margin-top: 4px; color: #374151; }
  .tabela-resumo { width: 60%; margin: 18px auto 0; border-collapse: collapse; }
  .tabela-resumo th, .tabela-resumo td { border: 1px solid #E5E7EB; padding: 6px 10px; text-align: left; font-size: 12px; }
  .tabela-resumo th { background: #F9FAFB; }

  .chip {
    display: inline-block; color: #fff; font-size: 10.5px; font-weight: 700;
    padding: 3px 10px; border-radius: 12px; white-space: nowrap;
  }
  .chip-tabela { font-size: 10px; padding: 2px 8px; }

  /* Pontos fortes */
  .ponto-forte { border-left: 4px solid #059669; background: #F0FDF4; padding: 8px 12px; margin-bottom: 10px; border-radius: 4px; }
  .ponto-forte-titulo { font-weight: 700; color: #065F46; margin-bottom: 3px; font-size: 12.5px; }
  .marca-forte { color: #059669; margin-right: 4px; }
  .ponto-forte-evidencia { font-size: 11px; color: #374151; }

  .lista-fracos { padding-left: 18px; }
  .lista-fracos li { margin-bottom: 8px; }

  /* Achados */
  .tabela-achados { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
  .tabela-achados th, .tabela-achados td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; vertical-align: top; }
  .tabela-achados th { background: #F9FAFB; }
  .col-arquivo { font-family: Consolas, monospace; font-size: 10px; }
  .linhas { color: #6B7280; }
  .sem-achados { color: #059669; font-style: italic; text-align: center; }

  .achado { border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin-bottom: 14px; page-break-inside: avoid; }
  .achado-cabecalho { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .achado-id { font-weight: 700; color: #6B7280; font-size: 11px; }
  .achado-titulo { font-weight: 700; font-size: 12.5px; }
  .achado-meta { font-size: 10.5px; color: #4B5563; margin-bottom: 6px; font-family: Consolas, monospace; }
  .codigo {
    background: #0F172A; color: #E2E8F0; font-family: Consolas, monospace; font-size: 9.5px;
    padding: 8px 10px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-break: break-word;
    margin: 0 0 8px;
  }
  .achado-campo { font-size: 11px; margin-bottom: 5px; }

  .grupo-recomendacao { margin-bottom: 16px; }
  .grupo-recomendacao h3 { font-size: 13.5px; color: #2563EB; }
  .grupo-recomendacao ol { padding-left: 18px; }
  .grupo-recomendacao li { margin-bottom: 6px; }

  .issues-markdown {
    font-family: Consolas, monospace; font-size: 9px; white-space: pre-wrap; word-break: break-word;
    background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 5px; padding: 10px; line-height: 1.5;
  }
`;

// ---------------------------------------------------------------- HTML ----

function buildHtml() {
  const porSeveridade = contarPorSeveridade(ACHADOS);
  const porCategoria = contarPorCategoria(ACHADOS);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de Auditoria de Segurança — ${escapeHtml(PROJETO)}</title>
<style>${CSS}</style>
</head>
<body>
  ${renderCapa()}
  ${renderResumoExecutivo(porSeveridade, porCategoria)}
  ${renderPontosFortes()}
  ${renderPontosFracos()}
  ${renderAchados()}
  ${renderRecomendacoes()}
  ${renderIssuesGithub()}
</body>
</html>`;
}

// --------------------------------------------------------------- main ----

function encontrarEdge() {
  for (const p of EDGE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    "Microsoft Edge não encontrado nos caminhos padrão. Ajuste EDGE_PATHS em gerar-relatorio.mjs."
  );
}

async function main() {
  const html = buildHtml();
  const htmlPath = path.join(__dirname, "_relatorio-tmp.html");
  fs.writeFileSync(htmlPath, html, "utf-8");

  const executablePath = encontrarEdge();
  console.log(`Usando navegador: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

    const outPath = path.join(__dirname, "relatorio-auditoria-seguranca.pdf");
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "2.3cm", bottom: "1.9cm", left: "2cm", right: "2cm" },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 8.5px; color: #6B7280; width: 100%; padding: 0 2cm; text-align: right;">
          Relatório de Auditoria de Segurança — ${escapeHtml(PROJETO)}
        </div>`,
      footerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 8.5px; color: #6B7280; width: 100%; padding: 0 2cm; display: flex; justify-content: space-between;">
          <span>${escapeHtml(DATA_AUDITORIA)}</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>`,
    });

    console.log(`PDF gerado em: ${outPath}`);
  } finally {
    await browser.close();
    fs.unlinkSync(htmlPath);
  }
}

export { buildHtml };

const executadoDiretamente =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (executadoDiretamente) {
  main().catch((err) => {
    console.error("Falha ao gerar relatório:", err);
    process.exit(1);
  });
}
