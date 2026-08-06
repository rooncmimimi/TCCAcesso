import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seguidoresService } from "@/services/empresas.service";
import { extrairMensagemErro } from "@/services/api";
import type { ResumoSeguidores } from "@/types";
import { toast } from "sonner";

/** Botão de seguir/deixar de seguir com atualização otimista, para usuários ou empresas. */
export function SeguirButton({
  alvoId,
  tipo,
  chaveResumo,
}: {
  alvoId: string;
  tipo: "usuario" | "empresa";
  chaveResumo: readonly unknown[];
}) {
  const queryClient = useQueryClient();

  const mutacao = useMutation({
    mutationFn: () =>
      tipo === "usuario"
        ? seguidoresService.alternarUsuario(alvoId)
        : seguidoresService.alternarEmpresa(alvoId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: chaveResumo });
      const anterior = queryClient.getQueryData<ResumoSeguidores>(chaveResumo);
      queryClient.setQueryData<ResumoSeguidores>(chaveResumo, (atual) =>
        atual
          ? {
              ...atual,
              seguindoEsteUsuario: !atual.seguindoEsteUsuario,
              seguidores: Math.max(0, atual.seguidores + (atual.seguindoEsteUsuario ? -1 : 1)),
            }
          : atual,
      );
      return { anterior };
    },
    onError: (erro, _v, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chaveResumo, contexto.anterior);
      toast.error(extrairMensagemErro(erro, "Não foi possível concluir a ação."));
    },
    onSuccess: (resultado) => {
      queryClient.setQueryData<ResumoSeguidores>(chaveResumo, (atual) =>
        atual ? { ...atual, seguindoEsteUsuario: resultado.seguindo } : atual,
      );
      toast.success(resultado.seguindo ? "Agora você está seguindo." : "Você deixou de seguir.");
    },
  });

  const resumo = queryClient.getQueryData<ResumoSeguidores>(chaveResumo);
  const seguindo = Boolean(resumo?.seguindoEsteUsuario);

  return (
    <Button
      type="button"
      variant={seguindo ? "outline" : "default"}
      className="min-h-11 gap-2"
      disabled={mutacao.isPending}
      aria-pressed={seguindo}
      onClick={() => mutacao.mutate()}
    >
      {mutacao.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : seguindo ? (
        <UserCheck className="size-4" aria-hidden="true" />
      ) : (
        <UserPlus className="size-4" aria-hidden="true" />
      )}
      {seguindo ? "Seguindo" : "Seguir"}
    </Button>
  );
}
