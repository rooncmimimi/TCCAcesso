import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  Briefcase,
  CheckCheck,
  Heart,
  KeyRound,
  Mail,
  MessageCircle,
  MessageSquare,
  Repeat2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import notificacoesService from "@/services/notificacoes.service";
import { seguidoresService } from "@/services/empresas.service";
import { urlArquivo } from "@/services/uploads.service";
import { initials } from "@/contexts/SessionContext";
import { extrairMensagemErro } from "@/services/api";
import { ouvirEvento } from "@/services/socket";
import { formatarTempoRelativo } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/types";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — ACESSO" },
      {
        name: "description",
        content:
          "Acompanhe candidaturas, vagas compatíveis e novidades da sua rede na plataforma ACESSO.",
      },
      { property: "og:title", content: "Notificações — ACESSO" },
      { property: "og:description", content: "Novidades sobre suas candidaturas e vagas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaNotificacoes,
});

/**
 * Ícone por `subtipo` (granular, migration 0033) — notificações antigas
 * (criadas antes da migration) não têm `subtipo`, então caem no fallback
 * por `tipo`, que sempre existiu.
 */
const ICONE_POR_SUBTIPO: Record<string, LucideIcon> = {
  curtida_postagem: Heart,
  comentario_postagem: MessageCircle,
  resposta_comentario: MessageCircle,
  compartilhamento_postagem: Repeat2,
  novo_seguidor_usuario: UserPlus,
  novo_seguidor_empresa: UserPlus,
  solicitacao_seguimento: UserPlus,
  candidatura_recebida: Briefcase,
  candidatura_atualizada: Briefcase,
  mensagem_nova: MessageSquare,
  postagem_removida_moderacao: ShieldAlert,
  comentario_removido_moderacao: ShieldAlert,
  vaga_oculta_moderacao: ShieldAlert,
  vaga_reexibida_moderacao: ShieldCheck,
  empresa_aprovada: ShieldCheck,
  empresa_reprovada: ShieldAlert,
  empresa_suspensa: ShieldAlert,
  empresa_reativada: ShieldCheck,
  denuncia_resolvida: ShieldCheck,
  denuncia_rejeitada: ShieldAlert,
  conta_bloqueada: ShieldAlert,
  conta_reativada: ShieldCheck,
  email_confirmado: Mail,
  senha_alterada: KeyRound,
  email_alterado: Mail,
};

const ICONE_POR_TIPO: Record<string, LucideIcon> = {
  Mensagem: MessageSquare,
  Vaga: Briefcase,
  Candidatura: Briefcase,
  Feed: Heart,
  Moderacao: ShieldAlert,
};

function iconeDe(n: Notificacao): LucideIcon {
  if (n.subtipo && ICONE_POR_SUBTIPO[n.subtipo]) return ICONE_POR_SUBTIPO[n.subtipo];
  return ICONE_POR_TIPO[n.tipo] ?? Bell;
}

/** Rota já existente para o conteúdo relacionado — `null` quando não há destino aplicável. */
function destinoDe(n: Notificacao): { to: string; params?: Record<string, string>; search?: Record<string, string> } | null {
  if (!n.entidadeTipo || !n.entidadeId) return null;

  switch (n.entidadeTipo) {
    case "postagem":
      return { to: "/postagem/$postagemId", params: { postagemId: n.entidadeId } };
    case "vaga":
      return { to: "/vaga/$vagaId", params: { vagaId: n.entidadeId } };
    case "conversa":
      return { to: "/mensagens", search: { conversaId: n.entidadeId } };
    case "usuario":
      return { to: "/perfil/$usuarioId", params: { usuarioId: n.entidadeId } };
    case "solicitacao_seguimento":
      // Aqui `entidadeId` é o id da SOLICITAÇÃO (usado por Aceitar/Recusar),
      // não de um perfil — o destino usa o autor da ação (`ator`) em vez dele.
      return n.ator?.id
        ? { to: "/perfil/$usuarioId", params: { usuarioId: n.ator.id } }
        : null;
    default:
      return null;
  }
}

function PaginaNotificacoes() {
  return (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Notificacoes />
    </GuardaAcesso>
  );
}

function Notificacoes() {
  const queryClient = useQueryClient();
  // Controla o botão "Seguir de volta" por notificação — evita reenviar o
  // toggle (que desseguiria) depois de já ter seguido de volta nesta sessão.
  const [seguidosDeVolta, setSeguidosDeVolta] = useState<Set<string>>(new Set());
  // Idem para Aceitar/Recusar solicitação — guarda o resultado por
  // `entidadeId` (id da solicitação) pra nunca reprocessar a mesma.
  const [solicitacoesProcessadas, setSolicitacoesProcessadas] = useState<
    Map<string, "aceita" | "recusada">
  >(new Map());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => notificacoesService.listar({ limit: 30 }),
  });

  useEffect(() => {
    return ouvirEvento("notificacao:nova", () => {
      void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    });
  }, [queryClient]);

  const invalidar = () => {
    // Prefixo compartilhado com o contador do sino (AppHeader) — uma
    // única invalidação atualiza a lista e o contador juntos.
    void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  const marcarUma = useMutation({
    mutationFn: (id: string) => notificacoesService.marcarComoLida(id),
    onSuccess: invalidar,
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const marcarTodas = useMutation({
    mutationFn: () => notificacoesService.marcarTodas(),
    onSuccess: () => {
      toast.success("Todas as notificações foram marcadas como lidas.");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const remover = useMutation({
    mutationFn: (id: string) => notificacoesService.remover(id),
    onSuccess: () => {
      toast.success("Notificação removida.");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const seguirDeVolta = useMutation({
    mutationFn: (usuarioId: string) => seguidoresService.alternarUsuario(usuarioId),
    onSuccess: (resultado, usuarioId) => {
      if (resultado.seguindo) {
        toast.success("Agora você está seguindo de volta.");
        setSeguidosDeVolta((atual) => new Set(atual).add(usuarioId));
      }
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível seguir de volta.")),
  });

  const aceitarSolicitacao = useMutation({
    mutationFn: (solicitacaoId: string) => seguidoresService.aceitarSolicitacao(solicitacaoId),
    onSuccess: (_dados, solicitacaoId) => {
      toast.success("Solicitação aceita.");
      setSolicitacoesProcessadas((atual) => new Map(atual).set(solicitacaoId, "aceita"));
      invalidar();
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Não foi possível aceitar a solicitação."));
      // 404 aqui normalmente significa que a solicitação já foi processada
      // (corrida com outra aba, ou o solicitante cancelou) — atualiza a
      // lista pra tirar os botões de uma solicitação que não existe mais.
      invalidar();
    },
  });

  const recusarSolicitacao = useMutation({
    mutationFn: (solicitacaoId: string) => seguidoresService.recusarSolicitacao(solicitacaoId),
    onSuccess: (_dados, solicitacaoId) => {
      toast.success("Solicitação recusada.");
      setSolicitacoesProcessadas((atual) => new Map(atual).set(solicitacaoId, "recusada"));
      invalidar();
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Não foi possível recusar a solicitação."));
      invalidar();
    },
  });

  function aoClicarNotificacao(n: Notificacao) {
    if (!n.lida) marcarUma.mutate(n.id);
  }

  const notificacoes = data?.dados ?? [];
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Notificações</h1>
          <p className="mt-1 text-muted-foreground" role="status" aria-live="polite">
            {isLoading
              ? "Carregando…"
              : naoLidas > 0
                ? `${naoLidas} não lida${naoLidas === 1 ? "" : "s"}`
                : "Nenhuma notificação não lida."}
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={naoLidas === 0 || marcarTodas.isPending}
          onClick={() => marcarTodas.mutate()}
        >
          <CheckCheck className="size-4" aria-hidden="true" /> Marcar todas como lidas
        </Button>
      </div>

      {isLoading && (
        <ul className="mt-6 space-y-3" aria-label="Carregando notificações">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Skeleton className="h-20 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <div role="alert" className="mt-6 space-y-3 rounded-xl border border-destructive/40 p-6">
          <p className="text-sm">Não foi possível carregar suas notificações.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && notificacoes.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border p-10 text-center text-muted-foreground">
          <BellOff className="size-8" aria-hidden="true" />
          <p className="text-sm">Você ainda não tem notificações.</p>
        </div>
      )}

      {notificacoes.length > 0 && (
        <ul className="mt-6 space-y-3">
          {notificacoes.map((n) => {
            const Icon = iconeDe(n);
            const destino = destinoDe(n);
            const tempo = formatarTempoRelativo(n.created_at);
            const estadoLida = n.lida ? "lida" : "não lida";
            const resultadoSolicitacao = n.entidadeId
              ? solicitacoesProcessadas.get(n.entidadeId)
              : undefined;
            const labelConteudo = `${n.titulo}. ${n.descricao ?? ""} ${tempo} — ${estadoLida}.`;

            const conteudo = (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                {n.ator ? (
                  <Avatar className="size-10 shrink-0">
                    {n.ator.fotoPerfil && <AvatarImage src={urlArquivo(n.ator.fotoPerfil)} alt="" />}
                    <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                      {initials(n.ator.nome)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
                  >
                    <Icon className="size-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className={cn("font-bold", !n.lida && "text-primary")}>{n.titulo}</p>
                  {n.descricao && <p className="text-sm text-muted-foreground">{n.descricao}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tempo}
                    <span className="sr-only"> — {estadoLida}</span>
                  </p>
                </div>
              </div>
            );

            return (
              <li key={n.id}>
                <Card
                  className={cn("shadow-none", !n.lida && "border-primary/40 bg-primary-soft/30")}
                >
                  <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
                    {destino ? (
                      <Link
                        to={destino.to}
                        params={destino.params}
                        search={destino.search}
                        onClick={() => aoClicarNotificacao(n)}
                        className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={labelConteudo}
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <div className="min-w-0">{conteudo}</div>
                    )}

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {!n.lida && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-11"
                            aria-label={`Marcar "${n.titulo}" como lida`}
                            disabled={marcarUma.isPending}
                            onClick={() => marcarUma.mutate(n.id)}
                          >
                            <CheckCheck className="size-4" aria-hidden="true" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-11 text-destructive"
                          aria-label={`Remover "${n.titulo}"`}
                          disabled={remover.isPending}
                          onClick={() => remover.mutate(n.id)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>

                      {n.subtipo === "novo_seguidor_usuario" && n.entidadeId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-9 text-xs"
                          disabled={seguirDeVolta.isPending || seguidosDeVolta.has(n.entidadeId)}
                          onClick={() => n.entidadeId && seguirDeVolta.mutate(n.entidadeId)}
                        >
                          {seguidosDeVolta.has(n.entidadeId) ? "Seguindo de volta" : "Seguir de volta"}
                        </Button>
                      )}

                      {n.subtipo === "solicitacao_seguimento" && n.entidadeId && (
                        resultadoSolicitacao ? (
                          <span className="text-xs font-medium text-muted-foreground">
                            {resultadoSolicitacao === "aceita" ? "Solicitação aceita" : "Solicitação recusada"}
                          </span>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              className="min-h-9 text-xs"
                              disabled={aceitarSolicitacao.isPending || recusarSolicitacao.isPending}
                              onClick={() => n.entidadeId && aceitarSolicitacao.mutate(n.entidadeId)}
                            >
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-9 text-xs"
                              disabled={aceitarSolicitacao.isPending || recusarSolicitacao.isPending}
                              onClick={() => n.entidadeId && recusarSolicitacao.mutate(n.entidadeId)}
                            >
                              Recusar
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
