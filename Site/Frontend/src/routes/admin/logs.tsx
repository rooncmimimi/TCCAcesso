import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/admin/logs")({
  head: () => metaPagina(dic().admin.meta.logs),
  component: AdminLogs,
});

function AdminLogs() {
  const t = useT();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t.admin.paginas.logs}</h1>
      <p className="text-sm text-muted-foreground">{t.admin.paginas.logsTexto}</p>
      <Card className="overflow-hidden p-0 shadow-none">
        <LogsTabela />
      </Card>
    </div>
  );
}
