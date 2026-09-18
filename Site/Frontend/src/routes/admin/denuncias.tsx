import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout de `/admin/denuncias`, que só renderiza `<Outlet />` para o TanStack Router ter dois
 * filhos independentes: a fila (`denuncias.index.tsx`) e o detalhe (`denuncias.$denunciaId.tsx`).
 * Sem o `<Outlet />`, o detalhe nunca apareceria (ver `perfil.tsx`).
 */
export const Route = createFileRoute("/admin/denuncias")({
  component: () => <Outlet />,
});
