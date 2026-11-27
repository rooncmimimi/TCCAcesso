/**
 * API de mentira, só para fotografar as telas da Central de Ajuda: dados inventados, nada de banco.
 *
 * Os catálogos fixos de acessibilidade vêm do próprio backend (são listas, não consultas), para a tela de
 * candidatura aparecer como no sistema real.
 */
import http from "node:http";

const PREFERENCIAS = { leituraPorVoz: false, consentimentoVoz: false, libras: false };

const USUARIOS = {
  candidato: {
    id: "u-cand", nome: "Ana Souza", email: "ana.souza@exemplo.com", tipo: "candidato", tipoUsuario: "candidato",
    ativo: true, temSenha: true, cadastroConcluidoEm: "2026-10-01T12:00:00Z", cadastroPendente: false,
    dadosPessoaisPendentes: false, termosVersao: "2026-11-04", emailVerificado: true,
  },
  empresa: {
    id: "u-emp", nome: "Carlos Lima", email: "contato@lojaexemplo.com.br", tipo: "empresa", tipoUsuario: "empresa",
    ativo: true, temSenha: true, cadastroConcluidoEm: "2026-10-01T12:00:00Z", cadastroPendente: false, emailVerificado: true,
  },
};
USUARIOS.pendente = {
  ...USUARIOS.empresa, id: "u-pend", email: "contato@padariaexemplo.com.br", nome: "Joana Melo",
  empresa: { id: "e2", razaoSocial: "Padaria Exemplo Ltda", nomeFantasia: "Padaria Exemplo", statusAprovacao: "pendente" },
};

const EMPRESA = {
  id: "e1", usuarioId: "u-emp", razaoSocial: "Loja Exemplo Ltda", nomeFantasia: "Loja Exemplo", setor: "Comércio",
  porte: "pequena", cidade: "Recife", estado: "PE", statusAprovacao: "aprovada", aprovada: true, empresaVerificada: true,
  usuario: { id: "u-emp" },
};

const vaga = (id, titulo, extra = {}) => ({
  id, titulo, empresaId: "e1", status: "aberta", modalidade: "hibrido", contrato: "clt", cidade: "Recife", estado: "PE",
  salario: 2200, cargaHoraria: "40 horas semanais", publicoAlvo: "pcd_cinquenta_mais", criadoEm: "2026-11-20T12:00:00Z",
  descricao: "Atendimento aos clientes na loja e apoio ao caixa. Treinamento no primeiro mês.",
  requisitos: "Ensino médio completo.", beneficios: "Vale-transporte e vale-refeição.",
  recursosAcessibilidade: ["elevador_rampa", "banheiro_adaptado", "jornada_adaptavel"],
  empresa: { id: "e1", nomeFantasia: "Loja Exemplo", razaoSocial: "Loja Exemplo Ltda", empresaVerificada: true, usuario: { id: "u-emp" } },
  ...extra,
});

const VAGAS = [
  vaga("v1", "Atendente de loja"),
  vaga("v2", "Auxiliar administrativo", { modalidade: "presencial", salario: 1900 }),
  vaga("v3", "Assistente de suporte", { modalidade: "remoto", salario: 2600 }),
];

const CANDIDATO = {
  id: "c1", usuarioId: "u-cand", usuario: USUARIOS.candidato, tituloProfissional: "Atendente", cidade: "Recife", estado: "PE", pais: "BR",
  biografia: "Gosto de atender pessoas e aprender coisas novas.", escolaridade: null,
  experiencias: [{ id: "x1", cargo: "Atendente", empresa: "Mercado Exemplo", dataInicio: "2023-02-01", dataFim: "2025-06-30", atual: false, descricao: "Atendimento no balcão." }],
  formacoes: [], certificados: [], habilidades: [], deficiencias: [],
};

const MINHA = {
  adaptacoes: [], observacao: null,
  comunicacao: { canaisPreferidos: [], canaisAEvitar: [], melhorHorario: null, observacao: null },
  privacidade: { exibirDeficienciaNoPerfil: false }, deficiencias: [],
};

const candidatura = (id, daVaga, status, nome) => ({
  id, status, criadoEm: "2026-11-22T12:00:00Z", mensagem: "Tenho interesse na vaga.", vaga: daVaga,
  candidato: { ...CANDIDATO, usuario: { ...USUARIOS.candidato, nome } }, adaptacoes: null,
});

const pagina = (chave, itens) => ({ sucesso: true, [chave]: itens, itens, total: itens.length, pagina: 1, limite: 10, totalPaginas: 1 });

async function catalogosDoBackend() {
  const adaptacoes = await import(new URL("../../../Backend/src/utils/adaptacoes.js", import.meta.url));
  const ambiente = await import(new URL("../../../Backend/src/utils/ambienteDeTrabalho.js", import.meta.url));
  return {
    adaptacoes: {
      grupos: adaptacoes.GRUPOS_DE_ADAPTACAO,
      adaptacoes: adaptacoes.ADAPTACOES,
      canaisPreferidos: adaptacoes.CANAIS_DE_COMUNICACAO,
      canaisAEvitar: adaptacoes.CANAIS_A_EVITAR,
      respostasDaEmpresa: adaptacoes.RESPOSTAS_DA_EMPRESA,
      termoVersao: adaptacoes.VERSAO_DO_TERMO_DE_ADAPTACOES,
    },
    ambiente: ambiente.catalogoDoAmbiente(),
  };
}

function responder(metodo, caminho, quem, catalogos) {
  const usuario = USUARIOS[quem];
  const ok = (corpo) => ({ sucesso: true, ...corpo });

  if (caminho === "/auth/me") return usuario ? ok({ usuario }) : [401, { mensagem: "Não autenticado." }];
  if (caminho === "/auth/google/disponivel") return ok({ disponivel: true });
  if (caminho === "/auth/google/conta") return ok({ disponivel: true, elegivel: true, vinculado: false });
  if (caminho === "/auth/seguranca/disponivel") return ok({ habilitado: false, ativo: false });
  if (caminho === "/acessibilidade") return ok({ preferencias: PREFERENCIAS });

  if (caminho === "/candidatos/me") return ok({ candidato: CANDIDATO });
  if (/^\/perfil\/candidatos(\/usuario)?\/[\w-]+$/.test(caminho)) return ok({ candidato: CANDIDATO });
  if (/^\/perfil\/usuario\//.test(caminho)) return ok({ usuario: quem === "empresa" ? USUARIOS.empresa : USUARIOS.candidato });
  const recurso = caminho.match(/^\/perfil\/(experiencias|formacoes|certificados|habilidades)$/);
  if (recurso) return pagina("registros", CANDIDATO[recurso[1]]);
  if (/^\/seguir\/(resumo|empresas)\//.test(caminho)) return ok({ totalSeguidores: 12, totalSeguindo: 3, seguidores: 12, seguindo: 3, seguindoEstaEmpresa: false });
  if (caminho === "/candidatos/curriculo/completar/disponibilidade") return ok({ disponivel: false });

  if (caminho === "/empresas/me") {
    return ok({ empresa: quem === "pendente" ? { ...EMPRESA, ...usuario.empresa, usuarioId: "u-pend", aprovada: false, empresaVerificada: false } : EMPRESA });
  }
  if (/^\/empresas\/usuario\//.test(caminho)) return ok({ empresa: EMPRESA });
  if (caminho === "/empresas/e1") return ok({ empresa: { ...EMPRESA, vagas: VAGAS } });
  if (caminho === "/empresas/parceiras") return ok({ empresas: [EMPRESA] });

  if (caminho === "/vagas/catalogo-acessibilidade") return ok({ catalogo: catalogos.ambiente });
  if (caminho === "/minha-acessibilidade/catalogo") return ok({ catalogo: catalogos.adaptacoes });
  if (caminho === "/minha-acessibilidade") return ok({ minhaAcessibilidade: MINHA });
  if (/^\/vagas\/v\d\/rascunho$/.test(caminho)) return ok({ rascunho: null });
  if (/^\/vagas\/v\d\/midia$/.test(caminho)) return ok({ midia: null });
  if (caminho === "/vagas" || caminho === "/vagas/minhas") return pagina("vagas", VAGAS.map((v) => ({ ...v, totalCandidaturas: 3 })));
  const umaVaga = caminho.match(/^\/vagas\/(v\d)$/);
  if (umaVaga) return ok({ vaga: VAGAS.find((v) => v.id === umaVaga[1]) ?? VAGAS[0] });
  // Candidaturas nas OUTRAS vagas: a primeira fica livre para o tutorial mostrar o botão de se candidatar.
  if (caminho === "/candidaturas/minhas") return pagina("candidaturas", [candidatura("k1", VAGAS[1], "em_analise", "Ana Souza"), candidatura("k2", VAGAS[2], "pendente", "Ana Souza")]);
  if (caminho === "/vagas/v1/candidaturas") return pagina("candidaturas", [candidatura("k1", VAGAS[0], "pendente", "Ana Souza"), candidatura("k3", VAGAS[0], "em_analise", "Bruno Alves")]);

  if (caminho === "/dashboard/empresa") return ok({ metricas: { vagas: 3, vagasAbertas: 3, candidaturas: 9, seguidores: 12 } });
  if (caminho === "/dashboard/candidato") return ok({ metricas: { candidaturas: 2, vagasFavoritas: 1, postagens: 4, seguidores: 12 } });
  if (metodo !== "GET") return ok({});

  // Qualquer outra leitura: listas vazias com os nomes que as telas procuram.
  const vazio = pagina("itens", []);
  for (const chave of ["candidaturas", "notificacoes", "conversas", "mensagens", "postagens", "usuarios", "empresas", "sugestoes", "vagas", "adaptacoes", "grupos", "habilidades", "deficiencias", "resultados"]) vazio[chave] = [];
  return vazio;
}

/** Sobe a API simulada e devolve o servidor (feche com `.close()`). */
export async function iniciarApiSimulada(porta) {
  const catalogos = await catalogosDoBackend();
  const servidor = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") return res.writeHead(204).end();

    const url = new URL(req.url, "http://x");
    if (url.pathname.startsWith("/socket.io")) return res.writeHead(404).end();

    const quem = (req.headers.authorization || "").replace("Bearer token-", "");
    let saida = responder(req.method, url.pathname.replace(/^\/api/, ""), quem, catalogos);
    let status = 200;
    if (Array.isArray(saida)) [status, saida] = saida;
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(saida));
  });
  await new Promise((resolver, falhar) => servidor.once("error", falhar).listen(porta, resolver));
  return servidor;
}
