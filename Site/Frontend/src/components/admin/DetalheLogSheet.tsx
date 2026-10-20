import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { rotuloOuValor } from "@/components/admin/rotulos";
import { useT, type Dicionario } from "@/i18n";
import { formatarDataHora } from "@/utils/formatacao";
import type { LogAdmin } from "@/services/admin.service";

function formatarValorSnapshot(t: Dicionario, chave: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return t.comum.semValor;
  if (chave === "criadaEm" && typeof valor === "string") return formatarDataHora(valor);
  if (chave === "publica") return valor ? t.comum.sim : t.comum.nao;
  if (chave === "midiaPorTipo" && typeof valor === "object") {
    const midia: Record<string, unknown> = t.admin.logs.detalhe.midia;
    const entradas = Object.entries(valor as Record<string, number>);
    return entradas.length
      ? entradas
          .map(([tipo, qtd]) => {
            const formatar = midia[tipo];
            return typeof formatar === "function" ? (formatar as (n: number) => string)(qtd) : `${qtd} ${tipo}`;
          })
          .join(", ")
      : t.admin.logs.detalhe.nenhum;
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
  const t = useT();
  const td = t.admin.logs.detalhe;
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
                {log.entidadeTipo && (
                  <Badge variant="outline">{rotuloOuValor(t.admin.logs.entidades, log.entidadeTipo)}</Badge>
                )}
                <Badge variant="secondary">{td.admin(log.administrador?.nome ?? t.admin.comum.contaRemovida)}</Badge>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">{td.descricao}</h3>
                <p>{log.descricao ?? td.semDescricao}</p>
              </div>

              {retrato && (
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">
                    {td.retrato}
                  </h3>
                  <dl className="space-y-1.5 rounded-lg border border-border p-3">
                    {Object.entries(retrato)
                      .filter(([chave]) => chave !== "conteudo")
                      .map(([chave, valor]) => (
                        <div key={chave} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{rotuloOuValor(td.campos, chave)}</dt>
                          <dd className="text-right font-medium">{formatarValorSnapshot(t, chave, valor)}</dd>
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
                <p>{td.ip(log.ip ?? t.comum.semValor)}</p>
                <p className="truncate" title={log.userAgent ?? undefined}>
                  {td.dispositivo(log.userAgent ?? t.comum.semValor)}
                </p>
              </div>

              {log.metadados && (
                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-xs font-bold uppercase text-muted-foreground">
                    {td.dadosBrutos}
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
