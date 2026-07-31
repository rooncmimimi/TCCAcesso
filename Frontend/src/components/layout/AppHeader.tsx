import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  ChevronDown,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  User,
  Accessibility,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/feed", label: "Início", icon: Home },
  { to: "/vagas", label: "Vagas", icon: Briefcase },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
] as const;

export function AppHeader() {
  const { user, signOut } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/feed" aria-label="ACESSO — ir para o início" className="shrink-0">
          <Logo showWordmark={false} className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>

        <nav aria-label="Navegação principal" className="mx-auto">
          <ul className="flex items-center gap-1 sm:gap-2">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 min-w-11 flex-col items-center justify-center rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs",
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-5" aria-hidden="true" />
                    <span className="mt-0.5 hidden sm:inline">{item.label}</span>
                    <span className="sr-only sm:hidden">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="ml-auto h-11 shrink-0 gap-2 px-2"
              aria-label="Abrir menu do perfil"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                  {initials(user?.nome ?? "Visitante")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">
                {user?.nome?.split(" ")[0] ?? "Você"}
              </span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="truncate text-sm font-bold">{user?.nome ?? "Visitante"}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {user?.titulo ?? "Entre para personalizar sua experiência"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/perfil">
                <User aria-hidden="true" /> Ver perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/configuracoes/acessibilidade">
                <Accessibility aria-hidden="true" /> Configurações de acessibilidade
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/configuracoes">
                <Settings aria-hidden="true" /> Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/ajuda">
                <HelpCircle aria-hidden="true" /> Ajuda
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/" onClick={() => signOut()}>
                <LogOut aria-hidden="true" /> Sair
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
