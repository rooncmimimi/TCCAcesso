/**
 * Dados estruturados da auditoria de segurança do ACESSO — Fase 9.
 * Fonte única de verdade para o relatório HTML/PDF e para as issues do
 * GitHub geradas ao final. Cada achado foi verificado no código real
 * (arquivo:linha) e, quando aplicável, confirmado por teste ao vivo via
 * API antes de entrar aqui — nenhum item é especulativo.
 */

export const PROJETO = "ACESSO";
export const DATA_AUDITORIA = "02 de setembro de 2026";

export const ESCOPO = [
  "Backend: Site/Backend (Node.js 20+ / Express 5 / Sequelize 6 / PostgreSQL via Supabase / JWT via jsonwebtoken / Supabase Storage para arquivos).",
  "Frontend: Site/Frontend (React 19 / TypeScript / Vite / TanStack Router+Query / Radix UI).",
  "Deploy: render.yaml (Render.com) — sem Docker/CI (.github) neste repositório.",
  "23 arquivos de rota do backend, todos os controllers/services associados, e os componentes de frontend com renderização de conteúdo de usuário ou controle de acesso por papel.",
];

export const NOTA_METODOLOGICA = [
  {
    categoria: "1. Banco sem tranca (isolamento)",
    mapeamento:
      "Este projeto NÃO usa Supabase RLS como mecanismo de isolamento: o backend conecta ao Postgres diretamente via Sequelize com credenciais completas (config/database.js), o que bypassa qualquer RLS que a UI do Supabase possa ter. A autoridade real de isolamento é o filtro manual por `req.user.id`/posse em cada service, mais um mecanismo de bloqueio social (`BloqueioService`) que várias telas precisam respeitar. A auditoria verificou a presença desse filtro em TODOS os handlers, e a aplicação consistente do bloqueio nos pontos de listagem social.",
  },
  {
    categoria: "2. Permissão definida no navegador",
    mapeamento:
      "Mapeado para `rbacMiddleware(...papeis)` (Express) cruzado com os gates de UI em React (`GuardaAcesso`, condicionais por `user.tipo`). Verificado se cada rota que o frontend esconde por papel tem o rbac correspondente no backend.",
  },
  {
    categoria: "3. IDOR",
    mapeamento:
      "Percorridos sistematicamente os 23 arquivos de rota do backend (não amostra) e os métodos de serviço correspondentes, verificando se todo handler que recebe um ID (path/query/body) confirma posse (`garantirDono`, `garantirParticipante`, `garantirConversa`, `buscarProprio`, ou filtro direto no WHERE) antes de ler/alterar/remover.",
  },
  {
    categoria: "4. Chaves expostas",
    mapeamento:
      "Verificado config/env.js (fail-fast de variáveis obrigatórias), .env.example, histórico completo do `git log -p`, e o bundle de produção do frontend (`npm run build` + grep no `dist/`).",
  },
  {
    categoria: "5. Inputs sem tratamento (XSS)",
    mapeamento:
      "Sem framework de templates server-side para HTML de resposta (API é JSON puro) — a superfície real é: (a) e-mails HTML gerados no backend (utils/emailTemplates.js) e (b) renderização de conteúdo de usuário no frontend React. Verificada a função de escape usada nos e-mails e todo uso de `dangerouslySetInnerHTML`/`innerHTML`/`href` com dado controlado pelo usuário no frontend.",
  },
];

/**
 * severidade: "critica" | "alta" | "media" | "baixa" | "informativa"
 * categoria: 1-5 (índice da categoria pedida)
 */
export const ACHADOS = [
  {
    id: "A1",
    severidade: "media",
    categoria: 1,
    titulo: "Bloqueio entre usuários não é aplicado em `GET /compartilhamentos/usuario/:usuarioId`",
    arquivo: "Site/Backend/src/services/CompartilhamentoService.js",
    linhas: "79–103",
    trecho: `async listarPorUsuario(usuarioId, query, solicitante) {
    ...
    if (solicitante && !ehAdministrador(solicitante)) {
        const idsSeguidos = await SeguidorService.idsSeguidos(solicitante.id);
        wherePostagem[Op.or] = [
            sequelize.literal(
                \`EXISTS (SELECT 1 FROM usuarios u WHERE u.id = "postagem"."usuario_id"
                  AND (u.perfil_publico = true OR u.tipo_usuario = 'empresa'))\`
            ),
            { usuarioId: { [Op.in]: [...idsSeguidos, solicitante.id] } }
        ];
        // <- nunca consulta BloqueioService aqui
    }`,
    descricao:
      "O método que alimenta a aba \"Compartilhamentos\" do perfil filtra por perfil público/seguidor, mas nunca chama `BloqueioService`/`garantirAcessoAPostagem` — ao contrário de TODO outro ponto de acesso a conteúdo social do projeto (feed geral, busca, comentários, curtidas e até o método irmão `listarPorPostagem` da mesma classe, linha 49-50, que corretamente reaproveita `garantirAcessoAPostagem`).",
    exploracao:
      "Um usuário bloqueado (em qualquer direção) continua enxergando a lista de publicações que a outra parte compartilhou, desde que a publicação original seja pública — violando a regra de isolamento social que o próprio projeto define e aplica em todos os outros lugares (Fase 9, Bloco 2).",
    evidencia:
      "Teste ao vivo (script descartável, contas e2e-audit-*): A bloqueia B; B compartilha uma publicação pública; GET /compartilhamentos/usuario/:idDeB feito por A retorna HTTP 200 com 1 item — deveria devolver lista vazia ou 403, como o feed geral corretamente faz para o mesmo par bloqueado (GET /postagens?usuarioId=... retornou 403 no mesmo teste).",
    condicoes:
      "Não depende de nenhuma flag ou configuração — reprodutível em qualquer ambiente sempre que existir um compartilhamento de uma publicação pública entre as duas partes.",
  },
  {
    id: "A2",
    severidade: "media",
    categoria: 1,
    titulo: "Endpoint duplicado `POST /empresas/:id/seguir` ignora bloqueio (bypass confirmado)",
    arquivo: "Site/Backend/src/services/InteracaoService.js",
    linhas: "100–120 (rota: Site/Backend/src/routes/empresaRoutes.js, 53–60)",
    trecho: `async alternarSeguir(empresaId, solicitante) {
    const candidato = await this.candidatoDoUsuario(solicitante.id);
    const empresa = await Empresa.findByPk(empresaId);
    if (!empresa) throw ApiError.notFound("Empresa não encontrada.");
    const existente = await EmpresaSeguida.findOne({
        where: { candidatoId: candidato.id, empresaId }
    });
    // <- nunca chama BloqueioService.estaBloqueadoEntre aqui
    if (existente) { await existente.destroy(); return { seguindo: false }; }
    await EmpresaSeguida.create({ candidatoId: candidato.id, empresaId });
    return { seguindo: true };
}`,
    descricao:
      "Existe um segundo caminho para seguir empresa, gravando na mesma tabela `EmpresaSeguida` que `SeguidorService.alternarEmpresa` (o caminho \"oficial\", usado pelo frontend), mas sem nenhuma checagem de bloqueio. Já está marcado como `@deprecated` no próprio código-fonte (Fase 9, Bloco 5) e nenhum consumidor foi encontrado no frontend/App/scripts — mas a rota continua montada e acessível a qualquer candidato autenticado.",
    exploracao:
      "Um candidato bloqueado por uma empresa (ou que bloqueou a empresa) consegue segui-la mesmo assim, chamando `POST /empresas/:id/seguir` em vez de `POST /seguir/empresas/:id` — o endpoint correto recusa com 403, este aceita com 200.",
    evidencia:
      "Teste ao vivo: candidato bloqueia o usuário da empresa; POST /seguir/empresas/:id (endpoint novo) → 403, como esperado; POST /empresas/:id/seguir (endpoint antigo, mesmo candidato, mesma empresa, bloqueio ainda ativo) → 200, seguimento criado.",
    condicoes:
      "Requer conhecer o ID da empresa (público) — nenhuma outra pré-condição. Já documentado como risco conhecido no código-fonte; esta auditoria reconfirma que o bypass continua ativo hoje.",
  },
  {
    id: "A3",
    severidade: "baixa",
    categoria: 1,
    titulo: "Rotas de upload genéricas sem associação a um recurso do usuário",
    arquivo: "Site/Backend/src/routes/uploadRoutes.js",
    linhas: "24–29, 38–43",
    trecho: `router.post("/imagem", uploadImagem.single("arquivo"),
    processarArmazenamento, UploadController.imagem);
...
router.post("/anexos", uploadAnexos.array("arquivos", 4),
    processarArmazenamento, UploadController.anexos);
// processarArmazenamento = criarProcessadorArmazenamento({}) -> pasta vazia,
// sempre bucket público, sem prefixo por usuário`,
    descricao:
      "Diferente das demais rotas de upload do projeto (foto/capa de perfil, anexo de postagem, currículo — todas gravam em uma pasta com o `usuarioId` do dono, ex. `postagens/<usuarioId>/...`), estas duas rotas usam `criarProcessadorArmazenamento({})` sem `pasta`, gravando direto na raiz do bucket público, sem nenhuma amarração ao usuário ou a um registro no banco.",
    exploracao:
      "Qualquer usuário autenticado (candidato, empresa ou administrador) pode fazer upload de imagens arbitrárias para a raiz do bucket público repetidamente, sem cota por usuário nem rastro de dono — o único limite é o `apiLimiter` genérico (300 req/15min por IP). Confirmado que nenhum consumidor do frontend chama estas duas rotas (`grep` no Site/Frontend não encontrou nenhuma chamada a `/upload/imagem` ou `/upload/anexos`) — é superfície de ataque exposta sem uso funcional real.",
    evidencia:
      "Leitura de código: `uploadMiddleware.js` linha ~305 define `processarArmazenamento = criarProcessadorArmazenamento({})`; comparado com `postagemRoutes.js`, que sempre passa `pasta: (req) => \\`postagens/${req.user.id}\\`` (escopado). Busca em Site/Frontend/src por `/upload/imagem` e `/upload/anexos`: nenhuma ocorrência.",
    condicoes:
      "Requer apenas uma conta autenticada (qualquer papel) — nenhuma configuração especial.",
  },
  {
    id: "A4",
    severidade: "baixa",
    categoria: 5,
    titulo: "Tokens de sessão (JWT de acesso e de renovação) guardados em localStorage",
    arquivo: "Site/Frontend/src/services/api.ts",
    linhas: "8–9, 21, 26, 31, 35–36",
    trecho: `export const ACCESS_TOKEN_KEY = "acesso:accessToken";
export const REFRESH_TOKEN_KEY = "acesso:refreshToken";
...
export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}
...
if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);`,
    descricao:
      "Tanto o token de acesso quanto o de renovação (refresh) ficam em `localStorage`, acessível a qualquer script que rode no mesmo domínio. Esta auditoria não encontrou nenhum XSS ativo hoje (item 5 do escopo, verificado exaustivamente: nenhum `dangerouslySetInnerHTML`/`innerHTML` com dado de usuário, e-mails HTML sempre escapados, único `href` com URL de usuário validado por allowlist de protocolo) — mas caso um XSS seja introduzido no futuro (nova dependência, novo componente com renderização rica), o impacto passa de \"execução de script\" para \"sequestro completo de sessão\", porque um `httpOnly` cookie não teria esse problema (JavaScript não consegue lê-lo).",
    exploracao:
      "Não há exploração direta hoje — é um item de defesa em profundidade (o \"segundo degrau\" de proteção que falta caso o \"primeiro degrau\", ausência de XSS, seja rompido no futuro).",
    evidencia:
      "Leitura de código confirmando o mecanismo de armazenamento; nenhum XSS explorável foi encontrado para efetivamente extrair esses valores no estado atual do código.",
    condicoes:
      "Só se torna criticamente explorável SE E QUANDO um XSS futuro for introduzido em qualquer página autenticada — condição hipotética, não presente hoje.",
  },
];

export const PONTOS_FORTES = [
  {
    titulo: "IDOR — verificação de posse consistente em toda a base",
    evidencia:
      "23/23 arquivos de rota auditados. Padrões centralizados e reaproveitados: `garantirDono()` (utils/authorization.js:51-61, compara `String(donoId) !== String(usuario.id)`, admin sempre passa), `garantirParticipante()` (ConversaService.js:80-86), `garantirConversa()` (ChatbotService.js:353-374), `buscarProprio()` (PerfilCandidatoService.js:190-208). Notificações e favoritos vão além: filtram `usuarioId` DIRETO no WHERE da query (NotificacaoService.js:187-189, 221-223), tornando o objeto de outro usuário literalmente inexistente para a consulta — nunca revela sequer que o ID existe.",
  },
  {
    titulo: "RBAC — nenhuma rota administrativa depende só do frontend",
    evidencia:
      "`adminRoutes.js:17` aplica `router.use(authMiddleware, rbacMiddleware(\"administrador\"))` uma única vez para TODAS as ~30 rotas do painel — proteção de bloco, não rota a rota. Frontend replica isso via layout `admin.tsx` (`GuardaAcesso tipos={[\"administrador\"]}`), mas a segurança real está no middleware do backend, confirmado independentemente. Rotas empresa-only (`vagaRoutes.js`) e candidato-only (`dashboardRoutes.js`, `perfilRoutes.js`) seguem o mesmo padrão.",
  },
  {
    titulo: "Ações administrativas sensíveis têm proteção extra além do papel",
    evidencia:
      "`UsuarioService.setAtivo()` (linha 172-182) usa `garantirAlvoDeAcaoAdministrativa` para impedir um admin de desativar a própria conta OU outra conta administrativa — proteção contra auto-lockout e abuso admin-sobre-admin, além do simples `rbacMiddleware`.",
  },
  {
    titulo: "Upload de arquivo — defesa em profundidade completa",
    evidencia:
      "`uploadMiddleware.js`: nome de arquivo sempre gerado no servidor (`crypto.randomUUID()`, nunca o nome original do cliente); extensão validada por allowlist; assinatura binária (magic bytes) conferida contra o mimetype declarado (`assinaturaValida()`, linhas 80-143) — um PDF renomeado para `.mp4` é rejeitado mesmo passando pela checagem de `Content-Type`; limite de tamanho por tipo de arquivo (vídeo nunca reaproveita o limite de imagem).",
  },
  {
    titulo: "Segredos — nenhum hardcode, nenhum default perigoso",
    evidencia:
      "`config/env.js`: `JWT_SECRET`/credenciais de banco são OBRIGATÓRIOS (`process.exit(1)` se ausentes) — sem fallback para um valor fixo; `JWT_SECRET` exige ≥32 caracteres. Chaves opcionais (`SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `BREVO_API_KEY`) caem em `null` (funcionalidade desabilitada), nunca em uma string-segredo padrão. `.env.example` contém apenas placeholders. `git log -p` completo sem nenhum segredo commitado. Bundle de produção do frontend (`npm run build` + grep no `dist/`) sem nenhuma chave de servidor embutida — só `VITE_API_URL` (uma URL pública) é exposta ao cliente.",
  },
  {
    titulo: "XSS — nenhuma renderização de HTML de usuário sem escape",
    evidencia:
      "Conteúdo de usuário (postagens, comentários, mensagens) sempre renderizado via interpolação JSX (`{variavel}`), nunca `dangerouslySetInnerHTML` — React escapa automaticamente. Os 2 únicos usos de `dangerouslySetInnerHTML`/`innerHTML` no frontend inteiro (VLibras.tsx:36 e ui/chart.tsx:73) usam string estática ou configuração fixa do desenvolvedor, nunca dado de usuário — verificado nos dois casos. Único campo de URL controlado pelo usuário renderizado como `href` (`empresa.site`) é validado com `isURL()` (allowlist de protocolo http/https/ftp) tanto na criação (authValidator.js) quanto na edição (empresaValidator.js) — testado ao vivo que `javascript:`/`data:` são rejeitados por essa validação.",
  },
  {
    titulo: "E-mails HTML — escape consistente em 100% dos templates",
    evidencia:
      "`emailTemplates.js`: toda variável potencialmente controlada por usuário (`nome`, `motivo`) passa por `escaparHtml()` (escapa `&`, `<`, `>`, `\"`) antes de entrar no HTML — inclusive dentro do `layoutBase()` compartilhado, que escapa a saudação inteira como camada extra.",
  },
  {
    titulo: "SQL Injection — Sequelize parametrizado; os 2 usos de SQL bruto são seguros",
    evidencia:
      "Todas as queries usam o query builder do Sequelize (prepared statements). Os únicos 2 usos de `sequelize.literal()` no projeto foram inspecionados: `CompartilhamentoService.js:94` usa uma string fixa sem interpolação de variável; `DenunciaService.js:537-539` interpola um valor via `sequelize.escape()`, a forma correta de sanitizar ao construir SQL bruto.",
  },
  {
    titulo: "Rate limiting e proteção contra força bruta",
    evidencia:
      "`authLimiter` (10 tentativas/15min, `skipSuccessfulRequests`) aplicado a 14 rotas de autenticação (`authRoutes.js`) — login, cadastro, recuperação de senha, 2FA. `apiLimiter` (300/15min) global em `/api`. Limiters dedicados por finalidade para denúncias e sugestão de IA, chaveados por usuário autenticado, não só por IP.",
  },
  {
    titulo: "Erros — stack trace nunca vaza em produção",
    evidencia:
      "`errorMiddleware.js`: `...(env.isProducao ? {} : { stack: err.stack })` — o campo `stack` só é incluído na resposta HTTP quando `NODE_ENV !== \"production\"`. Logs de erro detalhados ficam só no `console.error` do servidor.",
  },
  {
    titulo: "CORS restrito por allowlist explícita",
    evidencia:
      "`app.js:26-38`: função de origem customizada que só libera origens em `env.security.corsOrigins` (derivado de `FRONTEND_URL`) — nunca um wildcard `*`, mesmo com `credentials: true`.",
  },
  {
    titulo: "Fallback de código por e-mail (dev) nunca vaza em produção",
    evidencia:
      "Tanto `RecuperacaoSenhaService.js` quanto `authService.js` (troca de e-mail) só fazem `console.info` do código de verificação quando `EmailService` está indisponível E `process.env.NODE_ENV !== \"production\"` — o fallback de desenvolvimento é explicitamente desligado em produção.",
  },
];
