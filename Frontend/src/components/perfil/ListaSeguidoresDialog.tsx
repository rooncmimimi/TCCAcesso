import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, useSession } from "@/contexts/SessionContext";
import { seguidoresService } from "@/services/empresas.service";
import { urlArquivo } from "@/services/uploads.service";
import type { SugestaoPerfil } from "@/types";

/** Lista de seguidores/seguindo de um usuário, aberta a partir dos contadores do perfil. */
export function ListaSeguidoresDialog({
  usuarioId,
  modo,
  total,
  children,
}: {
  usuarioId: string;
  modo: "seguidores" | "seguindo";
  total: number;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const { user } = useSession();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["perfil-lista", modo, usuarioId],
    queryFn: () =>
      modo === "seguidores"
        ? seguidoresService.seguidores(usuarioId, { limit: 50 })
        : seguidoresService.seguindoDe(usuarioId, { limit: 50 }),
    enabled: aberto,
  });

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modo === "seguidores" ? "Seguidores" : "Seguindo"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando…
          </div>
        ) : isError ? (
          <p role="alert" className="py-4 text-sm text-destructive">
            Não foi possível carregar a lista.
          </p>
        ) : !data || data.dados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Users className="size-8" aria-hidden="true" />
            <p className="text-sm">
              {modo === "seguidores" ? "Ninguém segue este perfil ainda." : "Ainda não segue ninguém."}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {data.dados.map((pessoa: SugestaoPerfil) => (
              <li key={pessoa.id}>
                <Link
                  to={pessoa.id === user?.id ? "/perfil" : "/perfil/$usuarioId"}
                  params={pessoa.id === user?.id ? undefined : { usuarioId: pessoa.id }}
                  className="flex items-center gap-3 rounded-lg py-3 hover:bg-secondary focus-visible:bg-secondary"
                  onClick={() => setAberto(false)}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />
                    <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                      {initials(pessoa.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{pessoa.nome}</p>
                    {pessoa.titulo ? <p className="truncate text-xs text-muted-foreground">{pessoa.titulo}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {total > (data?.dados.length ?? 0) && !isLoading && !isError ? (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Mostrando {data?.dados.length ?? 0} de {total}.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
