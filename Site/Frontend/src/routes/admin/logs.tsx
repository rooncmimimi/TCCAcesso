import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/admin/logs")({
  head: () => ({
    meta: [
      { title: "Logs de auditoria — Administração ACESSO" },
      { name: "description", content: "Histórico somente leitura das ações administrativas na plataforma ACESSO." },
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
