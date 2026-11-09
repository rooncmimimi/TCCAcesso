import { Link } from "@tanstack/react-router";
import { BarChart3, Briefcase, Building2, FileText, Flag, MessageSquare, ScrollText, Users } from "lucide-react";
import { useIdioma } from "@/hooks/useIdioma";

const ITENS = [
  { to: "/admin", label: "admin.navegacaoAdmin.relatorios", icon: BarChart3, exact: true },
  { to: "/admin/denuncias", label: "admin.navegacaoAdmin.denuncias", icon: Flag, exact: false },
  { to: "/admin/empresas", label: "admin.navegacaoAdmin.empresas", icon: Building2, exact: false },
  { to: "/admin/usuarios", label: "admin.navegacaoAdmin.usuarios", icon: Users, exact: false },
  { to: "/admin/postagens", label: "admin.navegacaoAdmin.postagens", icon: FileText, exact: false },
  { to: "/admin/comentarios", label: "admin.navegacaoAdmin.comentarios", icon: MessageSquare, exact: false },
  { to: "/admin/vagas", label: "cabecalho.vagas", icon: Briefcase, exact: false },
  { to: "/admin/logs", label: "admin.navegacaoAdmin.logs", icon: ScrollText, exact: false },
] as const;

export function NavegacaoAdmin() {
  const { t } = useIdioma();
  return (
    <nav aria-label={t("admin.navegacaoAdmin.navegacaoAdministrativa")} className="border-b bg-card">
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
              {t(label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
