import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seguidoresService } from "@/services/empresas.service";
import { extrairMensagemErro } from "@/services/api";
import { cn } from "@/lib/utils";
import type { ResumoSeguidores } from "@/types";
import { toast } from "sonner";

type Acao = "seguir" | "deixar-de-seguir" | "solicitar" | "cancelar-solicitacao";

interface Estado {
  rotulo: string;
  acao: Acao;
  variant: "default" | "outline";
  icon: typeof UserPlus;
}

/**
 * Estados do botão (Fase 3) — usuário/candidato tem 5 estados (perfil
 * público vs. privado); empresa continua o binário original (sem conceito
 * de solicitação/aprovação).
 */
function resolverEstado(resumo: ResumoSeguidores | undefined, tipo: "usuario" | "empresa"): Estado {
  const seguindo = Boolean(resumo?.seguindoEsteUsuario);

  if (tipo === "empresa") {
    return seguindo
      ? { rotulo: "Seguindo", acao: "deixar-de-seguir", variant: "outline", icon: UserCheck }
      : { rotulo: "Seguir", acao: "seguir", variant: "default", icon: UserPlus };
  }

  if (seguindo) {
    return { rotulo: "Deixar de seguir", acao: "deixar-de-seguir", variant: "outline", icon: UserCheck };
  }

  const perfilPrivado = resumo?.perfilPublico === false;

  if (!perfilPrivado) {
    return resumo?.elesSeguemVoce
      ? { rotulo: "Seguir de volta", acao: "seguir", variant: "default", icon: UserPlus }
      : { rotulo: "Seguir", acao: "seguir", variant: "default", icon: UserPlus };
  }

  if (resumo?.solicitacaoPendente) {
    return { rotulo: "Solicitação enviada", acao: "cancelar-solicitacao", variant: "outline", icon: Clock };
  }

  return { rotulo: "Solicitar para seguir", acao: "solicitar", variant: "default", icon: UserPlus };
}

/** Botão de seguir/deixar de seguir/solicitar, com atualização otimista, para usuários ou empresas. */
export function SeguirButton({
  alvoId,
  tipo,
  chaveResumo,
  className,
}: {
  alvoId: string;
  tipo: "usuario" | "empresa";
  chaveResumo: readonly unknown[];
  /** Classes extras de layout (ex.: `w-full` em cartões) — nunca substitui as classes de estado do botão. */
  className?: string;
}) {
  const queryClient = useQueryClient();
  const resumo = queryClient.getQueryData<ResumoSeguidores>(chaveResumo);
  const { rotulo, acao, variant, icon: Icone } = resolverEstado(resumo, tipo);

  const mutacao = useMutation({
    mutationFn: async (acaoExecutada: Acao) => {
      if (tipo === "empresa") {
        return seguidoresService.alternarEmpresa(alvoId);
      }

      switch (acaoExecutada) {
        case "solicitar":
          return seguidoresService.solicitar(alvoId);
        case "cancelar-solicitacao":
          await seguidoresService.cancelarSolicitacao(alvoId);
          return { seguindo: false, solicitacaoCriada: false, solicitacaoPendente: false };
        default:
          return seguidoresService.alternarUsuario(alvoId);
      }
    },
    onMutate: async (acaoExecutada) => {
      await queryClient.cancelQueries({ queryKey: chaveResumo });
      const anterior = queryClient.getQueryData<ResumoSeguidores>(chaveResumo);

      queryClient.setQueryData<ResumoSeguidores>(chaveResumo, (atual) => {
        if (!atual) return atual;

        if (acaoExecutada === "cancelar-solicitacao") {
          return { ...atual, solicitacaoPendente: false };
        }

        if (acaoExecutada === "solicitar") {
          // Otimista só marca "pendente" — se o backend seguir direto (perfil
          // virou público entre um clique e outro), `onSuccess` corrige.
          return { ...atual, solicitacaoPendente: true };
        }

        const passaASeguir = acaoExecutada === "seguir";
        return {
          ...atual,
          seguindoEsteUsuario: passaASeguir,
          totalSeguidores: Math.max(0, atual.totalSeguidores + (passaASeguir ? 1 : -1)),
        };
      });

      return { anterior };
    },
    onError: (erro, _v, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(chaveResumo, contexto.anterior);
      toast.error(extrairMensagemErro(erro, "Não foi possível concluir a ação."));
    },
    onSuccess: (resultado, acaoExecutada) => {
      queryClient.setQueryData<ResumoSeguidores>(chaveResumo, (atual) => {
        if (!atual) return atual;

        if (acaoExecutada === "cancelar-solicitacao") {
          return { ...atual, solicitacaoPendente: false };
        }

        if (acaoExecutada === "solicitar") {
          // Perfil privado (caso comum): fica pendente. Perfil virou público
          // nesse meio-tempo (raro): o backend já seguiu direto.
          return resultado.seguindo
            ? { ...atual, seguindoEsteUsuario: true, solicitacaoPendente: false }
            : { ...atual, solicitacaoPendente: true };
        }

        return { ...atual, seguindoEsteUsuario: Boolean(resultado.seguindo) };
      });

      if (acaoExecutada === "cancelar-solicitacao") {
        toast.success("Solicitação cancelada.");
      } else if (acaoExecutada === "solicitar" && !resultado.seguindo) {
        toast.success("Solicitação enviada.");
      } else {
        toast.success(resultado.seguindo ? "Agora você está seguindo." : "Você deixou de seguir.");
      }
    },
  });

  // Bloqueio (Fase 9, Bloco 5): nunca oferece uma ação de seguir que o
  // backend recusaria de qualquer forma. `/descobrir` já exclui pessoas
  // bloqueadas na origem (nunca chega aqui bloqueado); notificações antigas
  // ("Seguir de volta" de alguém bloqueado depois de já ter seguido) são o
  // caso real — em vez de mostrar um botão fadado a 403, não mostra nada.
  // Depois de `useMutation` (nunca antes de um Hook — ordem fixa sempre).
  if (tipo === "usuario" && resumo?.bloqueado) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn("min-h-11 gap-2", className)}
      disabled={mutacao.isPending}
      aria-pressed={acao === "deixar-de-seguir" || acao === "cancelar-solicitacao"}
      onClick={() => mutacao.mutate(acao)}
    >
      {mutacao.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icone className="size-4" aria-hidden="true" />
      )}
      {rotulo}
    </Button>
  );
}
