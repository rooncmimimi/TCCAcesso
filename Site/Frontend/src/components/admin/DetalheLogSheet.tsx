import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ChaveBase } from "@/i18n/dicionarios";
import { useIdioma } from "@/hooks/useIdioma";
import { Badge } from "@/components/ui/badge";
import { formatarDataHora } from "@/utils/formatacao";
import type { LogAdmin } from "@/services/admin.service";

const ROTULOS_SNAPSHOT: Record<string, ChaveBase> = {
  id: "admin.detalheLogSheet.id",
  autorId: "admin.detalheLogSheet.idDoAutor",
  nomeAutor: "admin.detalheLogSheet.autor",
  conteudo: "admin.detalheLogSheet.conteudo",
  midiaPorTipo: "admin.detalheLogSheet.anexosPorTipo",
  totalAnexos: "admin.detalheLogSheet.totalDeAnexos",
  totalCurtidas: "admin.detalheLogSheet.curtidas",
  totalComentarios: "admin.detalheLogSheet.comentarios",
  publica: "admin.detalheLogSheet.visivelAVisitantes",
  criadaEm: "admin.detalheLogSheet.criadoEm",
  postagemId: "admin.detalheLogSheet.idDaPublicacao",
  autorPostagemId: "admin.detalheLogSheet.idDoAutorDaPublicacao",
  nomeAutorPostagem: "admin.detalheLogSheet.autorDaPublicacao",
};

function formatarValorSnapshot(chave: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (chave === "criadaEm" && typeof valor === "string") return formatarDataHora(valor);
  if (chave === "publica") return valor ? "Sim" : "Não";
  if (chave === "midiaPorTipo" && typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, number>);
    return entradas.length ? entradas.map(([tipo, qtd]) => `${qtd} ${tipo}`).join(", ") : "Nenhum";
  }
  return String(valor);
}

/**
 * Detalhe de um registro de auditoria, montado com o que a listagem já trouxe (a API envia
 * `metadados` inteiro), sem rota própria. Um registro sem `metadados.retrato` mostra o que existir,
 * sem inventar o que não foi guardado.
 */
export function DetalheLogSheet({
  log,
  open,
  onOpenChange,
}: {
  log: LogAdmin | null;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  const { t } = useIdioma();
  const retrato = (log?.metadados?.retrato ?? null) as Record<string, unknown> | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {log && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-base">{log.acao}</SheetTitle>
              <SheetDescription>{formatarDataHora(log.criadoEm)}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {log.entidadeTipo && <Badge variant="outline">{log.entidadeTipo}</Badge>}
                <Badge variant="secondary">Admin: {log.administrador?.nome ?? t("admin.conteudoDenunciado.contaRemovida")}</Badge>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">{t("vagaDetalhe.descricao")}</h3>
                <p>{log.descricao ?? t("admin.detalheLogSheet.semDescricaoRegistrada")}</p>
              </div>

              {retrato && (
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">
                    {t("admin.detalheLogSheet.registroNoMomentoDaAcao")}
                  </h3>
                  <dl className="space-y-1.5 rounded-lg border border-border p-3">
                    {Object.entries(retrato)
                      .filter(([chave]) => chave !== "conteudo")
                      .map(([chave, valor]) => (
                        <div key={chave} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{ROTULOS_SNAPSHOT[chave] ? t(ROTULOS_SNAPSHOT[chave]) : chave}</dt>
                          <dd className="text-right font-medium">{formatarValorSnapshot(chave, valor)}</dd>
                        </div>
                      ))}
                  </dl>
                  {typeof retrato.conteudo === "string" && retrato.conteudo && (
                    <blockquote className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">
                      “{retrato.conteudo}”
                    </blockquote>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <p>IP: {log.ip ?? "—"}</p>
                <p className="truncate" title={log.userAgent ?? undefined}>
                  Dispositivo: {log.userAgent ?? "—"}
                </p>
              </div>

              {log.metadados && (
                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-xs font-bold uppercase text-muted-foreground">
                    {t("admin.detalheLogSheet.dadosBrutosRegistrados")}
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(log.metadados, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
