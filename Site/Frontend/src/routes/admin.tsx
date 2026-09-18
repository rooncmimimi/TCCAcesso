import { createFileRoute, Outlet } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { NavegacaoAdmin } from "@/components/admin/NavegacaoAdmin";
import { GuardaAcesso } from "@/components/GuardaAcesso";

export const Route = createFileRoute("/admin")({
  component: LayoutAdmin,
});

function LayoutAdmin() {
  return (
    <GuardaAcesso tipos={["administrador"]}>
      <EstruturaApp>
        <NavegacaoAdmin />
        <div className="mt-6">
          <Outlet />
        </div>
      </EstruturaApp>
    </GuardaAcesso>
  );
}
