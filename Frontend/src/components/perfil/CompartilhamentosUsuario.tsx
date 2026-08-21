import { useQuery } from "@tanstack/react-query";
import { Loader2, Repeat2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { initials } from "@/contexts/SessionContext";
import postagensService from "@/services/postagens.service";
import { urlArquivo } from "@/services/uploads.service";
import { formatarData } from "@/utils/format";
import { LinkAutor } from "./LinkAutor";

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
      {data.dados.map((item) => {
        const postagem = item.postagem;
        const autorOriginal = postagem?.usuario ?? postagem?.autor;

        return (
          <li key={item.id}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Repeat2 className="size-4" aria-hidden="true" /> Compartilhou · {formatarData(item.criadoEm)}
                </p>

                {item.comentario ? <p className="mb-3 text-sm">{item.comentario}</p> : null}

                <div className="rounded-lg border p-4">
                  <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                    <LinkAutor autorId={autorOriginal?.id} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="size-9">
                        <AvatarImage src={urlArquivo(autorOriginal?.fotoPerfil)} />
                        <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                          {initials(autorOriginal?.nome ?? "Usuário")}
                        </AvatarFallback>
                      </Avatar>
                    </LinkAutor>
                    <p className="truncate text-sm font-semibold">
                      <LinkAutor autorId={autorOriginal?.id} className="hover:underline focus-visible:underline">
                        {autorOriginal?.nome ?? "Usuário"}
                      </LinkAutor>
                    </p>
                  </header>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{postagem?.conteudo}</p>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
