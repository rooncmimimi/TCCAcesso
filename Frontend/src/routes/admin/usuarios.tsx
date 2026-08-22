import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout puro de `/admin/usuarios` — mesmo motivo de `admin/denuncias.tsx`:
 * precisa de `<Outlet />` para que `/admin/usuarios/$usuarioId`
 * (usuarios.$usuarioId.tsx, o detalhe) seja de fato renderizado.
 */
export const Route = createFileRoute("/admin/usuarios")({
  component: () => <Outlet />,
});
