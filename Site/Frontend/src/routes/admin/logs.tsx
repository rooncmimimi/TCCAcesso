import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({
    meta: [
      { title: textoDaPagina("admin.logs.logsDeAuditoriaAdministracao") },
      { name: "description", content: textoDaPagina("admin.logs.historicoSomenteLeituraDas") },
    ],
  }),
  component: AdminLogs,
});

function AdminLogs() {
  const { t } = useIdioma();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("admin.logs.logsDeAuditoria")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("admin.logs.registroSomenteLeituraDeTodas")}
      </p>
      <Card className="overflow-hidden p-0 shadow-none">
        <LogsTabela />
      </Card>
    </div>
  );
}
