import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/layouts/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { GuardaAcesso } from "@/components/GuardaAcesso";

export const Route = createFileRoute("/admin")({
  component: LayoutAdmin,
});

function LayoutAdmin() {
  return (
    <GuardaAcesso tipos={["administrador"]}>
      <AppShell>
        <AdminNav />
        <div className="mt-6">
          <Outlet />
        </div>
      </AppShell>
    </GuardaAcesso>
  );
}
