import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, MessageSquare, MessageSquareOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import mensagensService from "@/services/mensagens.service";
import { extrairMensagemErro } from "@/services/api";
import { toast } from "sonner";

/**
 * Abre (ou reabre) a conversa com o usuário deste perfil e vai direto para
 * ela — consulta antes se é permitido (Fase 4), pra nunca simplesmente
 * esconder o botão sem explicação: quando não permitido, ele continua
 * visível e focável (`aria-disabled`, não `disabled` nativo — leitor de
 * tela ainda anuncia o motivo), com o motivo em texto visível ao lado,
 * nunca só por cor ou só num tooltip. A autorização de verdade é sempre
 * do backend; esta consulta só decide o que mostrar.
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

  // Falha ao consultar (rede, etc.): não trava a ação — cai de volta pro
  // comportamento anterior à Fase 4 (backend segue sendo a autoridade real
  // no clique, então isso nunca é uma brecha de segurança, só um degrade
  // de UX numa falha de rede pontual).
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
