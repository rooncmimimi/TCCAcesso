import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const ITENS = [
  { to: "/admin", label: "Relatórios" },
  { to: "/admin/empresas", label: "Empresas pendentes" },
  { to: "/admin/usuarios", label: "Usuários" },
  { to: "/admin/postagens", label: "Publicações" },
  { to: "/admin/vagas", label: "Vagas" },
] as const;

/** Navegação por abas do painel administrativo. */
export function AdminNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav aria-label="Seções do painel administrativo" className="mt-6 overflow-x-auto">
      <ul className="flex min-w-max gap-2 rounded-lg bg-muted p-1">
        {ITENS.map((item) => {
          const ativo = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors",
                  ativo ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
