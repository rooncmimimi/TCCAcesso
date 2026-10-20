import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import type { Vaga } from "@/types";

/** Card compacto de vaga em destaque, usado na página inicial. */
export function VagaDestaqueCard({ vaga }: { vaga: Vaga }) {
  const t = useT();
  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? t.vagas.empresaParceira;
  const modalidade = t.vagas.modalidade[vaga.modalidade] ?? vaga.modalidade;
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  // Ver o comentário equivalente em VagaCard.tsx: só afeta o leitor de voz próprio do ACESSO.
  const resumoParaVoz = t.vagas.resumoParaVoz(vaga.titulo, nomeEmpresa, local || t.vagas.localNaoInformado, modalidade);

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
            <span className="inline-flex items-center text-primary" title={t.comum.empresaVerificadaTitulo}>
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t.comum.empresaVerificada}</span>
            </span>
          )}
          <span>
            · {modalidade}
            {local ? ` · ${local}` : ""}
          </span>
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {vaga.publicoAlvo && vaga.publicoAlvo !== "geral" && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                {t.vagas.publicoAlvoCurto[vaga.publicoAlvo]}
              </Badge>
            </li>
          )}
          {vaga.contrato && (
            <li>
              <Badge variant="secondary" className="gap-1 font-medium">
                {t.vagas.contrato[vaga.contrato] ?? vaga.contrato}
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
