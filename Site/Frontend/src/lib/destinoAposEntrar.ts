import type { UsuarioSessao } from "@/contexts/SessaoContext";

/** Para onde a pessoa vai logo depois de entrar. */
export type DestinoAposEntrar =
  | { to: "/cadastro/dados" }
  | { to: "/cadastro/candidato"; search: { retomar: true } }
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
 */
export function destinoAposEntrar(
  usuario: Pick<UsuarioSessao, "tipo" | "cadastroConcluidoEm" | "cadastroPendente" | "dadosPessoaisPendentes">,
): DestinoAposEntrar {
  if (usuario.tipo === "candidato" && usuario.dadosPessoaisPendentes) {
    return { to: "/cadastro/dados" };
  }

  // O servidor diz se falta dado obrigatório. Servidor antigo (sem o campo): cai na data de conclusão.
  const pendente = usuario.cadastroPendente ?? !usuario.cadastroConcluidoEm;

  if (usuario.tipo === "candidato" && pendente) {
    return { to: "/cadastro/candidato", search: { retomar: true } };
  }

  return { to: usuario.tipo === "administrador" ? "/admin" : "/feed" };
}
