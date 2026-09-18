import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, MessageSquare, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import mensagensService from "@/services/mensagens.service";
import { extrairMensagemErro } from "@/services/api";
import { toast } from "sonner";

/**
 * Abre (ou reabre) a conversa com o usuário deste perfil. Antes, consulta se é permitido, para
 * nunca esconder o botão sem explicação: sem permissão, ele continua visível e focável
 * (`aria-disabled`, e não `disabled`, para o leitor de tela anunciar), com o motivo em texto ao
 * lado, e não só por cor ou tooltip. A autorização real é do backend; esta consulta só decide o que
 * mostrar.
 */
export function EnviarMensagemButton({ alvoId }: { alvoId: string }) {
  const navigate = useNavigate();

  const consulta = useQuery({
    queryKey: ["pode-iniciar-conversa", alvoId],
    queryFn: () => mensagensService.podeIniciarConversa(alvoId),
    enabled: Boolean(alvoId),
  });

  const mutacao = useMutation({
    mutationFn: () => mensagensService.criarConversa({ usuarioId: alvoId }),
    onSuccess: (conversa) => {
      void navigate({ to: "/mensagens", search: { conversaId: conversa.id } });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível abrir a conversa.")),
  });

  if (consulta.isLoading) {
    return (
      <Button type="button" variant="outline" className="min-h-11 gap-2" disabled aria-busy="true">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Enviar mensagem
      </Button>
    );
  }

  // Se a consulta falhar (rede etc.), a ação não trava: o backend continua decidindo no clique,
  // então isto só afeta a interface, nunca a segurança.
  const permitido = consulta.isError ? true : consulta.data?.permitido !== false;
  const motivo = consulta.data?.motivo;

  if (!permitido) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2 text-muted-foreground opacity-70"
          aria-disabled="true"
          aria-describedby={`motivo-mensagem-${alvoId}`}
          onClick={(evento) => evento.preventDefault()}
        >
          <MessageSquareOff className="size-4" aria-hidden="true" />
          Mensagens indisponíveis
        </Button>
        <p id={`motivo-mensagem-${alvoId}`} className="max-w-64 text-right text-xs text-muted-foreground">
          {motivo ?? "Não é possível enviar mensagens para este usuário."}
        </p>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 gap-2"
      disabled={mutacao.isPending}
      onClick={() => mutacao.mutate()}
    >
      {mutacao.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <MessageSquare className="size-4" aria-hidden="true" />
      )}
      Enviar mensagem
    </Button>
  );
}
