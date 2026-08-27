import { useQuery } from "@tanstack/react-query";
import { Loader2, Repeat2 } from "lucide-react";
import postagensService from "@/services/postagens.service";
import { formatarData } from "@/utils/format";
import { CardPostagem } from "@/components/feed/CardPostagem";

/** Publicações que um usuário compartilhou, usadas na aba "Compartilhamentos" do perfil. */
export function CompartilhamentosUsuario({ usuarioId }: { usuarioId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["compartilhamentos-usuario", usuarioId],
    queryFn: () => postagensService.listarCompartilhamentosDoUsuario(usuarioId, { limit: 10 }),
    enabled: Boolean(usuarioId),
  });

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando compartilhamentos…
      </div>
    );
  }

  if (isError) {
    return <p role="alert" className="py-4 text-sm text-destructive">Não foi possível carregar os compartilhamentos.</p>;
  }

  if (!data || data.dados.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Nenhum compartilhamento por aqui ainda.</p>;
  }

  return (
    <ul className="space-y-4">
      {data.dados.map((item) => (
        <li key={item.id}>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Repeat2 className="size-4" aria-hidden="true" /> Compartilhou · {formatarData(item.criadoEm)}
          </p>
          {item.comentario ? <p className="mb-2 text-sm">{item.comentario}</p> : null}
          {item.postagem ? <CardPostagem postagem={item.postagem} /> : null}
        </li>
      ))}
    </ul>
  );
}
