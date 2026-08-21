import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import mensagensService from "@/services/mensagens.service";
import { extrairMensagemErro } from "@/services/api";
import { toast } from "sonner";

/** Abre (ou reabre) a conversa com o candidato/empresa deste perfil e vai direto para ela. */
export function EnviarMensagemButton({ tipo, alvoId }: { tipo: "candidato" | "empresa"; alvoId: string }) {
  const navigate = useNavigate();

  const mutacao = useMutation({
    mutationFn: () =>
      mensagensService.criarConversa(tipo === "candidato" ? { candidatoId: alvoId } : { empresaId: alvoId }),
    onSuccess: (conversa) => {
      void navigate({ to: "/mensagens", search: { conversaId: conversa.id } });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível abrir a conversa.")),
  });

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
