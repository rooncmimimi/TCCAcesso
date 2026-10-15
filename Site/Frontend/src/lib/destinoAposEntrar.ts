import type { UsuarioSessao } from "@/contexts/SessaoContext";

/** Para onde a pessoa vai logo depois de entrar. */
export type DestinoAposEntrar =
  | { to: "/cadastro/candidato"; search: { retomar: true } }
  | { to: "/admin" }
  | { to: "/feed" };

/**
 * O destino é o mesmo para quem entra por senha e para quem entra pelo Google; por isso mora aqui, e
 * não em cada tela (antes eram duas cópias, e a do Google lia um campo que não existe na resposta
 * crua do servidor).
 *
 * - Candidato que não terminou o cadastro volta de onde parou. É o caso de quem fechou a aba depois
 *   da etapa 2: as etapas de perfil e de acessibilidade exigem sessão e ficaram para depois.
 *   `cadastroConcluidoEm` nula é o sinal; contas anteriores a esse campo já nascem preenchidas pela
 *   migration, então ninguém antigo é mandado para o cadastro.
 * - Administrador vai direto ao painel; indo para `/feed` como os demais, parecia que o login não
 *   tinha funcionado.
 */
export function destinoAposEntrar(usuario: Pick<UsuarioSessao, "tipo" | "cadastroConcluidoEm">): DestinoAposEntrar {
  if (usuario.tipo === "candidato" && !usuario.cadastroConcluidoEm) {
    return { to: "/cadastro/candidato", search: { retomar: true } };
  }

  return { to: usuario.tipo === "administrador" ? "/admin" : "/feed" };
}
