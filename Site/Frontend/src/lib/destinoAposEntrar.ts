import type { UsuarioSessao } from "@/contexts/SessaoContext";

/**
 * O que a pessoa pretendia fazer ao chegar ao login. Hoje só existe uma intenção: quem veio de "Sou
 * empresa" e já tem conta de candidato entra por ela e segue para o cadastro da empresa.
 */
export type IntencaoAposEntrar = "empresa";

/** Para onde a pessoa vai logo depois de entrar. */
export type DestinoAposEntrar =
  | { to: "/cadastro/dados"; search?: { depois: IntencaoAposEntrar } }
  | { to: "/cadastro/candidato"; search: { retomar: true; depois?: IntencaoAposEntrar } }
  | { to: "/cadastro/empresa" }
  | { to: "/admin" }
  | { to: "/feed" };

/**
 * O destino é o mesmo para quem entra por senha e para quem entra pelo Google; por isso mora aqui, e
 * não em cada tela (antes eram duas cópias, e a do Google lia um campo que não existe na resposta
 * crua do servidor).
 *
 * - Candidato que criou a conta direto pelo Google e ainda não informou o CPF e o restante dos dados
 *   pessoais (`dadosPessoaisPendentes`) vai primeiro a `/cadastro/dados`: as etapas seguintes do
 *   cadastro pressupõem esses dados.
 * - Candidato com cadastro **pendente** volta de onde parou. Pendente é ter dado obrigatório faltando
 *   (`cadastroPendente`, calculado pelo servidor), e não ter deixado de clicar no último botão do
 *   assistente: as etapas de perfil profissional e de acessibilidade são opcionais, e quem fechou a aba
 *   nelas entra normalmente. Antes o sinal era só `cadastroConcluidoEm` nula, o que prendia numa etapa que
 *   nem pedia o dado que faltava (veja `AutenticacaoService.situacaoDoCadastro`).
 * - Administrador vai direto ao painel; indo para `/feed` como os demais, parecia que o login não
 *   tinha funcionado.
 *
 * **A intenção de empresa.** Quem clicou em "Sou empresa" e entrou com a conta de candidato que já
 * tinha não deve cair no feed: o que ela queria era cadastrar a empresa. Por isso, com
 * `depois === "empresa"`, o candidato com tudo em ordem vai a `/cadastro/empresa`. Quem ainda tem
 * cadastro pessoal por terminar termina primeiro (a empresa nasce de uma conta completa), e a
 * intenção viaja junto, para o assistente continuar na empresa ao fim. A intenção só vale para
 * candidato: empresa e administrador não cadastram empresa.
 */
export function destinoAposEntrar(
  usuario: Pick<UsuarioSessao, "tipo" | "cadastroConcluidoEm" | "cadastroPendente" | "dadosPessoaisPendentes">,
  depois?: IntencaoAposEntrar,
): DestinoAposEntrar {
  const intencao = usuario.tipo === "candidato" && depois === "empresa" ? ({ depois } as const) : null;

  if (usuario.tipo === "candidato" && usuario.dadosPessoaisPendentes) {
    return intencao ? { to: "/cadastro/dados", search: intencao } : { to: "/cadastro/dados" };
  }

  // O servidor diz se falta dado obrigatório. Servidor antigo (sem o campo): cai na data de conclusão.
  const pendente = usuario.cadastroPendente ?? !usuario.cadastroConcluidoEm;

  if (usuario.tipo === "candidato" && pendente) {
    return { to: "/cadastro/candidato", search: { retomar: true, ...(intencao ?? {}) } };
  }

  if (intencao) return { to: "/cadastro/empresa" };

  return { to: usuario.tipo === "administrador" ? "/admin" : "/feed" };
}
