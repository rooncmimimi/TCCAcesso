import { useQuery } from "@tanstack/react-query";
import { Loader2, Repeat2 } from "lucide-react";
import postagensService from "@/services/postagens.service";
import { PostagemCard } from "@/components/feed/PostagemCard";
import { extrairMensagemErro } from "@/services/api";
import { formatarData } from "@/utils/formatacao";

/**
 * Linha do tempo de um perfil, próprio ou de outra pessoa: publicações e compartilhamentos numa
 * lista só, intercalados por data.
 */
export function LinhaDoTempoUsuario({ usuarioId }: { usuarioId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["linha-do-tempo-usuario", usuarioId],
    queryFn: () => postagensService.listarLinhaDoTempo(usuarioId, { limit: 10 }),
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
      {data.dados.map((item) => (
        <li key={`${item.tipo}-${item.id}`}>
          {item.tipo === "compartilhamento" && (
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Repeat2 className="size-4" aria-hidden="true" /> Compartilhou · {formatarData(item.criadoEm)}
            </p>
          )}
          {item.tipo === "compartilhamento" && item.comentario ? (
            <p className="mb-2 text-sm">{item.comentario}</p>
          ) : null}
          {item.postagem ? <PostagemCard postagem={item.postagem} /> : null}
        </li>
      ))}
    </ul>
  );
}
