import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout de `/admin/usuarios`, pelo mesmo motivo de `admin/denuncias.tsx`: o `<Outlet />` é o que
 * permite renderizar o detalhe (`usuarios.$usuarioId.tsx`).
 */
export const Route = createFileRoute("/admin/usuarios")({
  component: () => <Outlet />,
});
