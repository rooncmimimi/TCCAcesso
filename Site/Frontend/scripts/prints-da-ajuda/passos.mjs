/**
 * Um item por print da Central de Ajuda. `nome` é o nome do arquivo, citado em `dados/tutoriaisAjuda.ts`.
 *
 * - `como`: com qual conta simulada abrir (nenhuma = visitante).
 * - `destacar`: o elemento contornado em vermelho. É obrigatório encontrá-lo: se a tela mudou e o alvo
 *   sumiu, a captura FALHA, em vez de gravar um print sem destaque.
 * - `recorte`: o pedaço da tela que vira a imagem (sem ele, o topo da janela).
 * - `preparar`: o que fazer antes (preencher, abrir uma janela).
 * - `fim`: recorta a parte de baixo do elemento, quando o que importa está no final.
 *
 * `t(chave)` devolve o texto do botão no idioma da captura, para os mesmos passos valerem nos três.
 * Dentro da página, `a.texto(texto, seletor)` acha pelo texto exato do elemento.
 */
export function passos(t) {
  const texto = (chave, seletor = "button, a") => `a.texto(${JSON.stringify(t(chave))}, ${JSON.stringify(seletor)})`;
  const css = (seletor) => `document.querySelector(${JSON.stringify(seletor)})`;
  const principal = css("main");
  const dialogo = css("[role=dialog], [role=alertdialog]");
  const cartao = `document.querySelector("main .shadow-card") || document.querySelector("main [class*=rounded]") || document.querySelector("main")`;
  const colunas = css("main .grid.lg\\:grid-cols-2");
  const clicar = (alvo) => `{ const b = await a.esperar(() => ${alvo}); b.click(); await dormir(1300); }`;
  const enviar = css("main button[type=submit]");

  return [
    /* Criar conta */
    { nome: "conta-1-inicio", url: "/", largura: 1100, destacar: css('header a[href="/cadastro"]'), alturaMaxima: 520 },
    { nome: "conta-2-dados-de-acesso", url: "/cadastro/candidato", largura: 640, destacar: enviar, recorte: cartao, alturaMaxima: 1500 },
    {
      nome: "conta-3-dados-pessoais",
      url: "/cadastro/candidato",
      largura: 640,
      preparar: `
        await a.esperar(() => document.querySelector("input[type=email]"));
        a.digitar("input[type=email]", "ana.souza@exemplo.com");
        a.digitar('input[placeholder="000.000.000-00"]', "529.982.247-25");
        a.digitar("input[type=password]", "Exemplo@2026");
        document.querySelector("[role=checkbox]").click();
        await dormir(500);
        document.querySelector("main button[type=submit]").click();
        await a.esperar(() => document.querySelector("input[type=date]"));
        await dormir(600);
      `,
      destacar: enviar,
      recorte: cartao,
      alturaMaxima: 1000,
    },

    /* Entrar e recuperar a senha */
    { nome: "entrar-1-login", url: "/entrar", largura: 640, destacar: enviar, recorte: cartao, alturaMaxima: 900 },
    { nome: "entrar-2-esqueci", url: "/entrar", largura: 640, destacar: css('a[href="/recuperar-senha"]'), recorte: cartao, alturaMaxima: 900 },
    { nome: "entrar-3-recuperar", url: "/recuperar-senha", largura: 640, destacar: enviar, recorte: cartao },

    /* Acessibilidade */
    { nome: "acessibilidade-1-inicio", url: "/", largura: 1100, destacar: css('main a[href="/configuracoes/acessibilidade"]'), alturaMaxima: 620 },
    { nome: "acessibilidade-2-painel", url: "/configuracoes/acessibilidade", largura: 720, destacar: texto("configuracoes.acessibilidade.salvarPreferencias"), recorte: principal, alturaMaxima: 900 },

    /* Vagas */
    { nome: "vagas-1-lista", url: "/vagas", como: "candidato", largura: 720, altura: 1500, destacar: texto("vaga.verVaga"), recorte: principal, alturaMaxima: 1100 },
    { nome: "vagas-2-abrir", url: "/vaga/v1", como: "candidato", largura: 720, destacar: texto("vagaDetalhe.candidatar"), recorte: principal, alturaMaxima: 900 },
    { nome: "vagas-3-candidatura", url: "/vaga/v1", como: "candidato", largura: 720, altura: 1000, preparar: clicar(texto("vagaDetalhe.candidatar")), recorte: dialogo, alturaMaxima: 900 },

    /* Perfil, candidaturas e adaptações */
    { nome: "perfil-1-importar", url: "/perfil", como: "candidato", largura: 720, altura: 1600, destacar: texto("perfil.perfilPessoal.importarDadosDoCurriculo"), recorte: principal, alturaMaxima: 1000 },
    { nome: "perfil-2-arquivo", url: "/perfil", como: "candidato", largura: 720, altura: 1000, preparar: clicar(texto("perfil.perfilPessoal.importarDadosDoCurriculo")), recorte: dialogo, alturaMaxima: 900 },
    { nome: "candidaturas-1-painel", url: "/dashboard/candidato", como: "candidato", largura: 900, altura: 1500, destacar: texto("post.cancelar", "main button"), recorte: principal, alturaMaxima: 1100 },
    { nome: "adaptacoes-1-pagina", url: "/minha-acessibilidade", como: "candidato", largura: 720, altura: 1200, recorte: principal, alturaMaxima: 820 },
    // O fim da primeira parte da página, onde fica o botão de salvar.
    {
      nome: "adaptacoes-2-salvar",
      // Com algo marcado, o botão de salvar aparece habilitado, como a pessoa o verá.
      preparar: `(await a.esperar(() => document.querySelector("main [role=checkbox]"))).click(); await dormir(500);`,
      url: "/minha-acessibilidade",
      como: "candidato",
      largura: 720,
      altura: 1200,
      destacar: texto("minha-acessibilidade.paginaMinhaAcessibilidade.salvarAdaptacoes"),
      recorte: `(() => { const b = ${texto("minha-acessibilidade.paginaMinhaAcessibilidade.salvarAdaptacoes")}; return b && (b.closest("section") || b.parentElement); })()`,
      fim: true,
      alturaMaxima: 420,
    },

    /* Empresa */
    { nome: "empresa-1-inicio", url: "/", largura: 1100, destacar: css('main a[href="/cadastro/empresa"]'), alturaMaxima: 620 },
    { nome: "empresa-2-escolha", url: "/cadastro/empresa", largura: 640, destacar: css('a[href^="/entrar?depois=empresa"]'), recorte: cartao, alturaMaxima: 900 },
    { nome: "empresa-3-dados", url: "/cadastro/empresa", como: "candidato", largura: 640, destacar: enviar, recorte: cartao, alturaMaxima: 1100 },
    { nome: "aprovacao-1-analise", url: "/feed", como: "pendente", largura: 720, destacar: texto("layouts.telaStatusEmpresa.verificarNovamente"), recorte: principal, alturaMaxima: 800, margem: 16 },

    /* Vagas da empresa */
    { nome: "vaga-1-painel", url: "/dashboard/empresa", como: "empresa", largura: 1100, destacar: texto("dashboard.novaVagaDialog.novaVaga"), alturaMaxima: 620 },
    { nome: "vaga-2-formulario", url: "/dashboard/empresa", como: "empresa", largura: 720, altura: 1000, preparar: clicar(texto("dashboard.novaVagaDialog.novaVaga")), recorte: dialogo, alturaMaxima: 940 },
    { nome: "gerenciar-1-acoes", url: "/dashboard/empresa", como: "empresa", largura: 1100, altura: 1200, destacar: texto("post.editar", "main button"), recorte: colunas, alturaMaxima: 560 },
    {
      nome: "recebidas-1-lista",
      url: "/dashboard/empresa",
      como: "empresa",
      largura: 1100,
      altura: 1400,
      preparar: clicar(texto("dashboard.vagaEmpresaCard.candidaturas", "main button")),
      destacar: texto("dashboard.vagaEmpresaCard.candidaturas", "main button"),
      recorte: colunas,
      alturaMaxima: 620,
    },
    { nome: "perfilempresa-1-pagina", url: "/perfil", como: "empresa", largura: 900, altura: 1200, destacar: texto("perfil.perfilEmpresa.editarPerfilDaEmpresa"), recorte: principal, alturaMaxima: 820 },

    /* Google (também usados na tela que aparece quando o Google não está vinculado) */
    { nome: "google-1-entrar", url: "/entrar", largura: 520, destacar: enviar, recorte: css("main form"), margem: 16 },
    {
      nome: "google-2-contas",
      url: "/configuracoes/seguranca",
      como: "candidato",
      largura: 760,
      destacar: texto("configuracoes.secaoContasConectadas.vincular", "main button"),
      recorte: `(() => { let e = ${texto("configuracoes.secaoContasConectadas.vincular", "main button")}; while (e && !/Google/.test(e.textContent)) e = e.parentElement; return e; })()`,
      margem: 14,
    },
    {
      nome: "google-3-senha",
      url: "/configuracoes/seguranca",
      como: "candidato",
      largura: 560,
      preparar: clicar(texto("configuracoes.secaoContasConectadas.vincular", "main button")),
      recorte: dialogo,
    },
  ];
}
