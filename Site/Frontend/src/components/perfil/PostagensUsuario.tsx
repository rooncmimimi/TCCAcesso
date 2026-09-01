import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import postagensService from "@/services/postagens.service";
import { CardPostagem } from "@/components/feed/CardPostagem";
import { extrairMensagemErro } from "@/services/api";

/**
 * Publicações de um usuário específico, usadas na aba "Publicações" do
 * perfil (próprio ou de terceiro). Reaproveita o `CardPostagem` do feed
 * para manter curtir/comentar/compartilhar/editar funcionando aqui também
 * — antes esta aba tinha um card próprio, somente leitura.
 */
export function PostagensUsuario({ usuarioId }: { usuarioId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["postagens-usuario", usuarioId],
    queryFn: () => postagensService.listar({ usuarioId, limit: 10 }),
    enabled: Boolean(usuarioId),
    retry: false,
  });

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando publicações…
      </div>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="py-4 text-sm text-destructive">
        {extrairMensagemErro(error, "Não foi possível carregar as publicações.")}
      </p>
    );
  }

  if (!data || data.dados.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Nenhuma publicação por aqui ainda.</p>;
  }

  return (
    <ul className="space-y-4">
      {data.dados.map((post) => (
        <li key={post.id}>
          <CardPostagem postagem={post} />
        </li>
      ))}
    </ul>
  );
}
