import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { initials } from "@/contexts/SessionContext";
import postagensService from "@/services/postagens.service";
import { urlArquivo } from "@/services/uploads.service";

/** Publicações de um usuário específico, usadas no perfil público. */
export function PostagensUsuario({ usuarioId }: { usuarioId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["postagens-usuario", usuarioId],
    queryFn: () => postagensService.listar({ usuarioId, limit: 10 }),
    enabled: Boolean(usuarioId),
  });

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando publicações…
      </div>
    );
  }

  if (isError) {
    return <p role="alert" className="py-4 text-sm text-destructive">Não foi possível carregar as publicações.</p>;
  }

  if (!data || data.dados.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Nenhuma publicação por aqui ainda.</p>;
  }

  return (
    <ul className="space-y-4">
      {data.dados.map((post) => (
        <li key={post.id}>
          <Card className="shadow-card">
            <CardContent className="p-5">
              <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={urlArquivo(post.usuario?.fotoPerfil ?? post.autor?.fotoPerfil)} />
                  <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                    {initials(post.usuario?.nome ?? post.autor?.nome ?? "Usuário")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{post.usuario?.nome ?? post.autor?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </header>
              <p className="mt-3 whitespace-pre-wrap text-sm">{post.conteudo}</p>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-4" aria-hidden="true" /> {post.totalCurtidas ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-4" aria-hidden="true" /> {post.totalComentarios ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
