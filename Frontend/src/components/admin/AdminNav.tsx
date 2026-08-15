import { Link } from "@tanstack/react-router";
import { BarChart3, Briefcase, Building2, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITENS = [
  { to: "/admin", label: "Relatórios", icon: BarChart3, exact: true },
  { to: "/admin/empresas", label: "Empresas", icon: Building2, exact: false },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, exact: false },
  { to: "/admin/postagens", label: "Postagens", icon: FileText, exact: false },
  { to: "/admin/vagas", label: "Vagas", icon: Briefcase, exact: false },
] as const;

export function AdminNav() {
  return (
    <nav aria-label="Navegação administrativa" className="border-b bg-card">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {ITENS.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}

              className="flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:border-primary [&.active]:text-foreground"
              activeProps={{ className: "active" }}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
