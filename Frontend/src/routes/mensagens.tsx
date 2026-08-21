import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessagesSquare } from "lucide-react";
import { z } from "zod";

import { AppShell } from "@/layouts/AppShell";
import { Card } from "@/components/ui/card";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { ListaConversas } from "@/components/mensagens/ListaConversas";
import { JanelaConversa } from "@/components/mensagens/JanelaConversa";
import { useSession } from "@/contexts/SessionContext";
import mensagensService from "@/services/mensagens.service";
import { extrairMensagemErro } from "@/services/api";
import {
  emitirDigitando,
  entrarNaConversa,
  ouvirEvento,
  sairDaConversa,
} from "@/services/socket";
import type { Conversa, Mensagem } from "@/lib/api-types";

export const Route = createFileRoute("/mensagens")({
  validateSearch: z.object({ conversaId: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Mensagens — ACESSO" },
      {
        name: "description",
        content:
          "Converse em tempo real com empresas parceiras sobre vagas e processos seletivos inclusivos.",
      },
      { property: "og:title", content: "Mensagens — ACESSO" },
      { property: "og:description", content: "Suas conversas com empresas inclusivas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaMensagens,
});

function PaginaMensagens() {
  return (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Mensagens />
    </GuardaAcesso>
  );
}

function Mensagens() {
  const { user } = useSession();
  const { conversaId } = Route.useSearch();
  const queryClient = useQueryClient();
  const usuarioId = user?.id ?? null;

  const [selecionadaId, setSelecionadaId] = useState<string | null>(conversaId ?? null);
  const [contatoDigitando, setContatoDigitando] = useState(false);
  const timerDigitando = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Chegando de "Conversar com a empresa" (vaga) ou de "Enviar mensagem" (perfil): abre a conversa certa direto. */
  useEffect(() => {
    if (conversaId) setSelecionadaId(conversaId);
  }, [conversaId]);

  const conversasQuery = useQuery({
    queryKey: ["conversas"],
    queryFn: () => mensagensService.listarConversas({ limit: 50 }),
  });

  const conversas = conversasQuery.data?.dados ?? [];
  const conversaSelecionada = conversas.find((c) => c.id === selecionadaId) ?? null;

  const mensagensQuery = useQuery({
    queryKey: ["mensagens", selecionadaId],
    queryFn: () => mensagensService.listarMensagens(selecionadaId as string, { limit: 100 }),
    enabled: Boolean(selecionadaId),
  });

  const mensagens = [...(mensagensQuery.data?.dados ?? [])].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );

  /* Entra na sala da conversa e marca as mensagens como lidas. */
  useEffect(() => {
    if (!selecionadaId) return;
    entrarNaConversa(selecionadaId);
    void mensagensService
      .marcarComoLidas(selecionadaId)
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversas"] }))
      .catch(() => undefined);
    return () => sairDaConversa(selecionadaId);
  }, [selecionadaId, queryClient]);

  /* Eventos em tempo real: novas mensagens e indicador de digitação. */
  useEffect(() => {
    /* O backend emite { conversaId, mensagem }; aceitamos também a mensagem crua. */
    const cancelarNova = ouvirEvento<{ conversaId?: string; mensagem?: Mensagem } & Partial<Mensagem>>(
      "mensagem:nova",
      (evento) => {
      const mensagem = (evento.mensagem ?? evento) as Mensagem;
      void queryClient.invalidateQueries({ queryKey: ["conversas"] });
      if (mensagem.conversaId === selecionadaId) {
        void queryClient.invalidateQueries({ queryKey: ["mensagens", selecionadaId] });
        /* Conversa aberta: marca imediatamente como lida. */
        if (mensagem.remetenteId !== usuarioId) {
          void mensagensService
            .marcarComoLidas(selecionadaId)
            .then(() => queryClient.invalidateQueries({ queryKey: ["conversas"] }))
            .catch(() => undefined);
        }
      }
      },
    );

    const cancelarDigitando = ouvirEvento<{ conversaId: string; usuarioId: string; digitando: boolean }>(
      "mensagem:digitando",
      (dados) => {
        if (dados.conversaId !== selecionadaId || dados.usuarioId === usuarioId) return;
        setContatoDigitando(dados.digitando);
        if (dados.digitando) {
          if (timerDigitando.current) clearTimeout(timerDigitando.current);
          timerDigitando.current = setTimeout(() => setContatoDigitando(false), 3000);
        }
      },
    );

    return () => {
      cancelarNova();
      cancelarDigitando();
    };
  }, [selecionadaId, usuarioId, queryClient]);

  const enviar = useMutation({
    mutationFn: (conteudo: string) =>
      mensagensService.enviar(selecionadaId as string, conteudo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mensagens", selecionadaId] });
      void queryClient.invalidateQueries({ queryKey: ["conversas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível enviar a mensagem.")),
  });

  function selecionar(conversa: Conversa) {
    setContatoDigitando(false);
    setSelecionadaId(conversa.id);
  }

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Mensagens</h1>
      <p className="mt-2 text-muted-foreground">
        Conversas em tempo real com empresas e candidatos.
      </p>

      <Card className="mt-6 grid h-[70vh] grid-cols-1 overflow-hidden p-0 shadow-card md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border-b border-border md:border-b-0 md:border-r">
          <ListaConversas
            conversas={conversas}
            usuarioId={usuarioId}
            conversaSelecionadaId={selecionadaId}
            carregando={conversasQuery.isLoading}
            erro={conversasQuery.isError}
            mensagemErro={
              conversasQuery.isError ? extrairMensagemErro(conversasQuery.error) : undefined
            }
            onSelecionar={selecionar}
          />
        </div>

        <div className="min-h-0">
          {conversaSelecionada ? (
            <JanelaConversa
              conversa={conversaSelecionada}
              usuarioId={usuarioId}
              mensagens={mensagens}
              carregando={mensagensQuery.isLoading}
              erro={mensagensQuery.isError}
              mensagemErro={
                mensagensQuery.isError ? extrairMensagemErro(mensagensQuery.error) : undefined
              }
              enviando={enviar.isPending}
              contatoDigitando={contatoDigitando}
              onEnviar={(conteudo) => enviar.mutate(conteudo)}
              onDigitando={() => selecionadaId && emitirDigitando(selecionadaId, true)}
            />
          ) : (
            <div
              role="status"
              className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground"
            >
              <MessagesSquare className="size-10" aria-hidden="true" />
              <p className="text-sm">Selecione uma conversa para ver as mensagens.</p>
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
