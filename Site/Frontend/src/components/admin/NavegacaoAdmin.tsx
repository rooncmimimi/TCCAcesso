import { Link } from "@tanstack/react-router";
import { BarChart3, Briefcase, Building2, FileText, Flag, MessageSquare, ScrollText, Users } from "lucide-react";
import { useT } from "@/i18n";

const ITENS = [
  { to: "/admin", chave: "relatorios", icon: BarChart3, exact: true },
  { to: "/admin/denuncias", chave: "denuncias", icon: Flag, exact: false },
  { to: "/admin/empresas", chave: "empresas", icon: Building2, exact: false },
  { to: "/admin/usuarios", chave: "usuarios", icon: Users, exact: false },
  { to: "/admin/postagens", chave: "postagens", icon: FileText, exact: false },
  { to: "/admin/comentarios", chave: "comentarios", icon: MessageSquare, exact: false },
  { to: "/admin/vagas", chave: "vagas", icon: Briefcase, exact: false },
  { to: "/admin/logs", chave: "logs", icon: ScrollText, exact: false },
] as const;

export function NavegacaoAdmin() {
  const t = useT().admin.navegacao;

  return (
    <nav aria-label={t.aria} className="border-b bg-card">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {ITENS.map(({ to, chave, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}

              className="flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:border-primary [&.active]:text-foreground"
              activeProps={{ className: "active" }}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t[chave]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
