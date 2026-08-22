import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout puro de `/admin/denuncias` — existe só para o TanStack Router poder
 * ter dois filhos independentes: `/admin/denuncias` (denuncias.index.tsx, a
 * fila) e `/admin/denuncias/$denunciaId` (denuncias.$denunciaId.tsx, o
 * detalhe). Sem este layout renderizando `<Outlet />`, o filho nunca aparece
 * — mesmo bug já corrigido antes em `perfil.tsx` (ver o comentário lá).
 */
export const Route = createFileRoute("/admin/denuncias")({
  component: () => <Outlet />,
});
