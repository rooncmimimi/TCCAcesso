import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROTULO_PUBLICO_ALVO_CURTO } from "@/components/dashboard/constantesVaga";
import type { Vaga } from "@/types";
import { useIdioma } from "@/hooks/useIdioma";

/** Card compacto de vaga em destaque, usado na página inicial. */
export function VagaDestaqueCard({ vaga }: { vaga: Vaga }) {
  const { t } = useIdioma();
  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? t("inicio.vagaDestaqueCard.empresaParceira");
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  // Ver o comentário equivalente em VagaCard.tsx: só afeta o leitor de voz próprio do ACESSO.
  const resumoParaVoz = t("inicio.vagaDestaqueCard.vagaDeEmpresaModalidade", { var1: vaga.titulo, var2: nomeEmpresa, var3: local || t("vaga.localNaoInformado"), var4: vaga.modalidade });

  return (
    <Card className="h-full border-border shadow-none transition-shadow hover:shadow-card">
      <CardContent className="p-5">
        <Link
          to="/vaga/$vagaId"
          params={{ vagaId: vaga.id }}
          data-speak={resumoParaVoz}
          className="text-lg font-bold hover:underline focus-visible:underline"
        >
          {vaga.titulo}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-muted-foreground">
          <span>{nomeEmpresa}</span>
          {vaga.empresa?.empresaVerificada && (
            <span className="inline-flex items-center text-primary" title={t("vaga.empresaVerificadaTitulo")}>
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t("vaga.empresaVerificada")}</span>
            </span>
          )}
          <span>
            · {vaga.modalidade}
            {local ? ` · ${local}` : ""}
          </span>
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {vaga.publicoAlvo && vaga.publicoAlvo !== "geral" && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                {ROTULO_PUBLICO_ALVO_CURTO[vaga.publicoAlvo]}
              </Badge>
            </li>
          )}
          {vaga.contrato && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                {vaga.contrato}
              </Badge>
            </li>
          )}
          {local && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                <MapPin className="size-3" aria-hidden="true" /> {local}
              </Badge>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
