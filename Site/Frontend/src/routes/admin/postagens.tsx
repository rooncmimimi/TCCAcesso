import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { PostagensTabela } from "@/components/admin/PostagensTabela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/admin/postagens")({
  head: () => ({
    meta: [
      { title: textoDaPagina("admin.postagens.publicacoesAdministracaoAcesso") },
      { name: "description", content: textoDaPagina("admin.postagens.moderePublicacoesEComentarios") },
      { property: "og:title", content: textoDaPagina("admin.postagens.publicacoesAdministracaoAcesso") },
      { property: "og:description", content: textoDaPagina("admin.postagens.moderacaoDePublicacoesE") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPostagens,
});

function AdminPostagens() {
  const { t } = useIdioma();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("admin.postagens.publicacoes")}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <PostagensTabela />
      </Card>
    </div>
  );
}
