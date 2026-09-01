import { Heart, MessageCircle, Paperclip } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { GaleriaAnexos } from "@/components/feed/GaleriaAnexos";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { formatarDataHora } from "@/utils/format";
import type { PostagemAdmin } from "@/services/admin.service";

/**
 * Detalhe completo de uma publicação (Fase 8) — substitui abrir a URL crua
 * da imagem em outra guia. Mídia reaproveita `GaleriaAnexos`/`LightboxMidia`
 * tal como no feed: mesmas URLs assinadas, mesmo download autorizado
 * (Fase 7) — nada de Storage é reimplementado aqui.
 */
export function DetalhePostagemSheet({
  postagem,
  open,
  onOpenChange,
}: {
  postagem: PostagemAdmin | null;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {postagem && (
          <>
            <SheetHeader>
              <SheetTitle>Publicação de {postagem.usuario?.nome ?? "usuário"}</SheetTitle>
              <SheetDescription>
                Publicado em {formatarDataHora(postagem.createdAt)}
                {postagem.usuario?.email ? ` · ${postagem.usuario.email}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={postagem.publica === false ? "outline" : "secondary"}>
                  {postagem.publica === false ? "Não visível a visitantes anônimos" : "Visível a visitantes anônimos"}
                </Badge>
                {postagem.ativo === false && <Badge variant="destructive">Removida pela moderação</Badge>}
              </div>

              <p className="whitespace-pre-wrap text-sm">{postagem.conteudo}</p>

              <GaleriaAnexos anexos={postagem.anexos ?? []} postagemId={postagem.id} />

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Heart className="size-4" aria-hidden="true" /> {postagem.totalCurtidas ?? 0} curtidas
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="size-4" aria-hidden="true" /> {postagem.totalComentarios ?? 0} comentários
                </span>
                {postagem.anexos && postagem.anexos.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="size-4" aria-hidden="true" /> {postagem.anexos.length} anexo
                    {postagem.anexos.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold">Histórico de moderação desta publicação</h3>
                <div className="rounded-lg border border-border">
                  <LogsTabela entidadeId={postagem.id} entidadeTipo="postagem" />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
