import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { formatarDataHora } from "@/utils/formatacao";
import { useT } from "@/i18n";
import type { ComentarioAdmin } from "@/services/admin.service";

export function DetalheComentarioSheet({
  comentario,
  open,
  onOpenChange,
}: {
  comentario: ComentarioAdmin | null;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  const t = useT().admin;
  const td = t.comentarios.detalhe;
  const dataCriacao = comentario?.criadoEm;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {comentario && (
          <>
            <SheetHeader>
              <SheetTitle>{td.titulo(comentario.usuario?.nome ?? t.comum.usuarioGenerico)}</SheetTitle>
              <SheetDescription>
                {dataCriacao ? td.comentadoEm(formatarDataHora(dataCriacao)) : td.dataNaoRegistrada}
                {comentario.usuario?.email ? ` · ${comentario.usuario.email}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 text-sm">
              <blockquote className="rounded-lg border-l-2 border-border bg-muted/40 p-3">
                {comentario.comentario}
              </blockquote>

              <div>
                <h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">
                  {td.publicacaoRelacionada}
                </h3>
                <p className="line-clamp-3 text-muted-foreground">
                  {comentario.postagem?.conteudo ?? td.publicacaoIndisponivel}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold">{td.historico}</h3>
                <div className="rounded-lg border border-border">
                  <LogsTabela entidadeId={comentario.id} entidadeTipo="comentario" />
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
