import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { useSession } from "@/contexts/SessionContext";
import { perfilService } from "@/services/perfil.service";
import { empresasService } from "@/services/empresas.service";
import { PerfilPessoal } from "@/components/perfil/PerfilPessoal";
import { PerfilEmpresa } from "@/components/perfil/PerfilEmpresa";

export const Route = createFileRoute("/perfil/$usuarioId")({
  head: () => ({
    meta: [
      { title: "Perfil — ACESSO" },
      { name: "description", content: "Perfil profissional acessível no ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <PerfilDeTerceiro />
    </GuardaAcesso>
  ),
});

/**
 * Perfil de outra pessoa/empresa, aberto ao clicar em uma foto/nome no feed.
 * Como o autor de uma postagem só carrega o `usuarioId`, esta rota resolve
 * se é um perfil de candidato ou de empresa antes de escolher o componente —
 * ambas as consultas (`perfil-publico-candidato` / `perfil-publico-empresa`)
 * usam a mesma chave que `PerfilPessoal`/`PerfilEmpresa` já usam sozinhas,
 * então a resolução aqui não gera uma segunda busca de rede.
 *
 * Terceiro fallback (`usuarioGenerico`): usuários sem registro de candidato
 * nem de empresa — hoje, só administradores. `PerfilPessoal` já sabe exibir
 * esse caso (é o mesmo componente usado quando um administrador vê o
 * próprio perfil), então reaproveitamos ele em vez de criar um componente novo.
 */
function PerfilDeTerceiro() {
  const { usuarioId } = Route.useParams();
  const { user } = useSession();

  const souEu = usuarioId === user?.id;

  const candidato = useQuery({
    queryKey: ["perfil-publico-candidato", usuarioId],
    queryFn: () => perfilService.perfilCompletoPorUsuario(usuarioId),
    enabled: !souEu,
    retry: false,
  });

  const empresa = useQuery({
    queryKey: ["perfil-publico-empresa", usuarioId],
    queryFn: () => empresasService.porUsuario(usuarioId),
    enabled: !souEu && candidato.isError,
    retry: false,
  });

  const usuarioGenerico = useQuery({
    queryKey: ["perfil-publico-usuario", usuarioId],
    queryFn: () => perfilService.usuarioPublico(usuarioId),
    enabled: !souEu && candidato.isError && empresa.isError,
    retry: false,
  });

  // Clicar no próprio nome/foto leva à página de perfil editável de sempre.
  if (souEu) {
    return <Navigate to="/perfil" />;
  }

  if (candidato.isSuccess) {
    return <PerfilPessoal usuarioId={usuarioId} />;
  }

  if (empresa.isSuccess) {
    return <PerfilEmpresa usuarioId={usuarioId} />;
  }

  if (usuarioGenerico.isSuccess) {
    return <PerfilPessoal usuarioId={usuarioId} />;
  }

  if (candidato.isError && empresa.isError && usuarioGenerico.isError) {
    return (
      <AppShell>
        <div role="alert" className="py-10 text-center text-sm text-muted-foreground">
          Este perfil não está disponível.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando perfil…
      </div>
    </AppShell>
  );
}
