import { Heart, MessageCircle, Paperclip } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIdioma } from "@/hooks/useIdioma";
import { Badge } from "@/components/ui/badge";
import { GaleriaAnexos } from "@/components/feed/GaleriaAnexos";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { formatarDataHora } from "@/utils/formatacao";
import type { PostagemAdmin } from "@/services/admin.service";

/**
 * Detalhe completo de uma publicação para a moderação. A mídia usa `GaleriaAnexos` e
 * `LightboxMidia`, como no feed: mesmas URLs assinadas e o mesmo download autorizado.
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
  const { t } = useIdioma();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {postagem && (
          <>
            <SheetHeader>
              <SheetTitle>Publicação de {postagem.usuario?.nome ?? t("admin.detalhePostagemSheet.usuario")}</SheetTitle>
              <SheetDescription>
                Publicado em {formatarDataHora(postagem.criadoEm)}
                {postagem.usuario?.email ? ` · ${postagem.usuario.email}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={postagem.publica === false ? "outline" : "secondary"}>
                  {postagem.publica === false ? "Não visível a visitantes anônimos" : t("admin.detalhePostagemSheet.visivelAVisitantesAnonimos")}
                </Badge>
                {postagem.ativo === false && <Badge variant="destructive">{t("admin.detalhePostagemSheet.removidaPelaModeracao")}</Badge>}
              </div>

              <p className="whitespace-pre-wrap text-sm">{postagem.conteudo}</p>

              <GaleriaAnexos anexos={postagem.anexos ?? []} postagemId={postagem.id} />

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Heart className="size-4" aria-hidden="true" /> {t("admin.detalhePostagemSheet.curtidas", { n: postagem.totalCurtidas ?? 0 })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="size-4" aria-hidden="true" /> {t("admin.detalhePostagemSheet.comentarios", { n: postagem.totalComentarios ?? 0 })}
                </span>
                {postagem.anexos && postagem.anexos.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="size-4" aria-hidden="true" /> {t("admin.detalhePostagemSheet.anexos", { n: postagem.anexos.length })}
                  </span>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold">{t("admin.detalhePostagemSheet.historicoDeModeracaoDesta")}</h3>
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
