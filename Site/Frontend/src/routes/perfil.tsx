import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout de `/perfil`, que só renderiza `<Outlet />` para o TanStack Router ter dois filhos:
 * `/perfil` (`perfil.index.tsx`, o usuário logado) e `/perfil/$usuarioId` (`perfil.$usuarioId.tsx`,
 * outra pessoa ou empresa).
 *
 * Pela convenção de arquivos, `perfil.$usuarioId.tsx` é filho de `/perfil` e só aparece dentro do
 * `<Outlet />` do pai. Com o conteúdo de "meu perfil" direto aqui, abrir o perfil de outra pessoa
 * mostraria o próprio perfil, mesmo com a URL certa.
 */
export const Route = createFileRoute("/perfil")({
  component: () => <Outlet />,
});
