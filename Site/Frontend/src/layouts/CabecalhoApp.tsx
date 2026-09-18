import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Accessibility,
  Activity,
  Bell,
  Briefcase,
  ChevronDown,
  Compass,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { BarraBusca } from "@/components/BarraBusca";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iniciaisDoNome } from "@/utils/formatacao";
import { useSessao } from "@/hooks/useSessao";
import { cn } from "@/lib/utils";
import notificacoesService from "@/services/notificacoes.service";
import mensagensService from "@/services/mensagens.service";
import { urlArquivo } from "@/utils/arquivos";
import { ouvirEvento } from "@/services/socket";

const nav = [
  { to: "/feed", label: "Início", icon: Home },
  { to: "/vagas", label: "Vagas", icon: Briefcase },
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
] as const;

/**
 * Cabeçalho do app: marca, navegação principal, busca global, contadores de mensagens e
 * notificações não lidas e menu do perfil. Para visitantes, mostra só a marca e os links públicos
 * (Vagas, Ajuda, Entrar e Criar conta).
 */
export function CabecalhoApp() {
  const { usuario, autenticado, sair } = useSessao();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Mesma chave-prefixo `["notificacoes"]` de `notificacoes.tsx`: marcar como lida ou remover uma
  // notificação lá invalida esta contagem (o React Query invalida por prefixo), então o contador
  // diminui sem precisar de evento extra.
  const { data: naoLidas = 0 } = useQuery({
    queryKey: ["notificacoes", "contador"],
    queryFn: () => notificacoesService.contarNaoLidas(),
    enabled: autenticado,
  });
  const [naoLidasMensagens, setNaoLidasMensagens] = useState(0);
  const pathnameAnteriorRef = useRef(pathname);

  useEffect(() => {
    if (!autenticado) {
      setNaoLidasMensagens(0);
      return;
    }

    let ativo = true;
    mensagensService
      .contarNaoLidas()
      .then((total) => {
        if (ativo) setNaoLidasMensagens(total);
      })
      .catch(() => undefined);

    const pararDeOuvir = ouvirEvento("notificacao:nova", () => {
      void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    });
    const pararDeOuvirMensagem = ouvirEvento("mensagem:nova", () => {
      setNaoLidasMensagens((atual) => atual + 1);
    });

    return () => {
      ativo = false;
      pararDeOuvir();
      pararDeOuvirMensagem();
    };
  }, [autenticado, queryClient]);

  /* Ao sair da tela de mensagens, resincroniza a contagem (o usuário pode ter lido conversas lá). */
  useEffect(() => {
    if (autenticado && pathnameAnteriorRef.current.startsWith("/mensagens") && !pathname.startsWith("/mensagens")) {
      void mensagensService.contarNaoLidas().then(setNaoLidasMensagens).catch(() => undefined);
    }
    pathnameAnteriorRef.current = pathname;
  }, [pathname, autenticado]);

  // Visitante sem sessão: nenhum elemento de navegação privada aparece (atalhos, busca global, menu
  // de perfil). É a mesma regra da página inicial pública, aplicada aqui porque o `CabecalhoApp`
  // (via `EstruturaApp`) também aparece em páginas públicas como a Ajuda.
  if (!autenticado) {
    return (
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="ACESSO — página inicial" className="shrink-0">
            <Logo showWordmark={false} className="sm:hidden" />
            <Logo className="hidden sm:inline-flex" />
          </Link>
          <nav aria-label="Navegação pública" className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
              <Link to="/vagas">Vagas</Link>
            </Button>
            <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
              <Link to="/ajuda">Ajuda</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button asChild className="min-h-11">
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 md:gap-3">
        <Link to="/feed" aria-label="ACESSO — ir para o início" className="shrink-0">
          <Logo showWordmark={false} className="sm:hidden" />
          <Logo className="hidden sm:inline-flex" />
        </Link>

        <BarraBusca />

        <nav aria-label="Navegação principal" className="mx-auto">
          <ul className="flex items-center gap-1 sm:gap-2">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              const contador =
                item.to === "/notificacoes" ? naoLidas : item.to === "/mensagens" ? naoLidasMensagens : 0;
              const mostrarContador = contador > 0;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-11 min-w-11 flex-col items-center justify-center rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors sm:px-4 sm:text-xs",
                      active
                        ? "bg-primary-soft text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <span className="relative">
                      <item.icon className="size-5" aria-hidden="true" />
                      {mostrarContador && (
                        <Badge
                          aria-hidden="true"
                          className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none"
                        >
                          {contador > 9 ? "9+" : contador}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 hidden sm:inline">{item.label}</span>
                    <span className="sr-only sm:hidden">
                      {item.label}
                      {mostrarContador ? ` — ${contador} não lidas` : ""}
                    </span>
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
                <AvatarImage src={urlArquivo(usuario?.fotoPerfil)} alt="" />
                <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                  {iniciaisDoNome(usuario?.nome ?? "Visitante")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">
                {usuario?.nome?.split(" ")[0] ?? "Você"}
              </span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="truncate text-sm font-bold">{usuario?.nome ?? "Visitante"}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {usuario?.titulo ?? "Entre para personalizar sua experiência"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/perfil">
                <User aria-hidden="true" /> Ver perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/minha-atividade">
                <Activity aria-hidden="true" /> Minha atividade
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/descobrir">
                <Compass aria-hidden="true" /> Descobrir
              </Link>
            </DropdownMenuItem>
            {(usuario?.tipo === "candidato" || usuario?.tipo === "empresa") && (
              <DropdownMenuItem asChild>
                <Link to="/dashboard">
                  <LayoutDashboard aria-hidden="true" /> Painel de indicadores
                </Link>
              </DropdownMenuItem>
            )}
            {usuario?.tipo === "administrador" && (
              <DropdownMenuItem asChild>
                <Link to="/admin">
                  <ShieldCheck aria-hidden="true" /> Painel administrativo
                </Link>
              </DropdownMenuItem>
            )}
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
            <DropdownMenuItem
              onSelect={(evento) => {
                evento.preventDefault();
                void sair().then(() => navigate({ to: "/" }));
              }}
            >
              <LogOut aria-hidden="true" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
