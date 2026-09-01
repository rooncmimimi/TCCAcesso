import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatarDataHora } from "@/utils/format";
import type { LogAdmin } from "@/services/admin.service";

const ROTULOS_SNAPSHOT: Record<string, string> = {
  id: "ID",
  autorId: "ID do autor",
  nomeAutor: "Autor",
  conteudo: "Conteúdo",
  midiaPorTipo: "Anexos por tipo",
  totalAnexos: "Total de anexos",
  totalCurtidas: "Curtidas",
  totalComentarios: "Comentários",
  publica: "Visível a visitantes anônimos",
  criadaEm: "Criado em",
  postagemId: "ID da publicação",
  autorPostagemId: "ID do autor da publicação",
  nomeAutorPostagem: "Autor da publicação",
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
 * Detalhe de um registro de `admin_audit_logs` (Fase 8) — tudo aqui vem do
 * que a listagem já carregou (`metadata` não é restrito na API), sem
 * endpoint dedicado. Um log antigo sem `metadata.snapshot` (formato
 * anterior à Fase 8) continua mostrando o que existir, sem forçar o
 * formato novo nem inventar dado que não foi registrado.
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
  const snapshot = (log?.metadata?.snapshot ?? null) as Record<string, unknown> | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {log && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-base">{log.acao}</SheetTitle>
              <SheetDescription>{formatarDataHora(log.created_at)}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {log.entidadeTipo && <Badge variant="outline">{log.entidadeTipo}</Badge>}
                <Badge variant="secondary">Admin: {log.admin?.nome ?? "Conta removida"}</Badge>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">Descrição</h3>
                <p>{log.descricao ?? "Sem descrição registrada."}</p>
              </div>

              {snapshot && (
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase text-muted-foreground">
                    Registro no momento da ação
                  </h3>
                  <dl className="space-y-1.5 rounded-lg border border-border p-3">
                    {Object.entries(snapshot)
                      .filter(([chave]) => chave !== "conteudo")
                      .map(([chave, valor]) => (
                        <div key={chave} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{ROTULOS_SNAPSHOT[chave] ?? chave}</dt>
                          <dd className="text-right font-medium">{formatarValorSnapshot(chave, valor)}</dd>
                        </div>
                      ))}
                  </dl>
                  {typeof snapshot.conteudo === "string" && snapshot.conteudo && (
                    <blockquote className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">
                      “{snapshot.conteudo}”
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

              {log.metadata && (
                <details className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-xs font-bold uppercase text-muted-foreground">
                    Dados brutos registrados
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(log.metadata, null, 2)}
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
