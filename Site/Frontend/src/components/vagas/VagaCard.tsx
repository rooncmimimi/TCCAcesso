import { Link } from "@tanstack/react-router";
import { BadgeCheck, Heart, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Vaga } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import {
  ICONE_RECURSO_ACESSIBILIDADE,
} from "@/components/dashboard/constantesVaga";

export function VagaCard({
  vaga,
  favoritada,
  onFavoritar,
  favoritando,
}: {
  vaga: Vaga;
  favoritada: boolean;
  onFavoritar: () => void;
  favoritando: boolean;
}) {
  const t = useT();
  const tc = t.vagasPagina.card;
  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? tc.empresa;
  const modalidade = t.vagas.modalidade[vaga.modalidade] ?? vaga.modalidade;
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  // `data-speak` só afeta o leitor de voz próprio do ACESSO (useLeituraAutomatica): o
  // nome acessível nativo do link continua sendo o título, sem duplicar leitura
  // para quem usa NVDA/JAWS/VoiceOver (esses seguem lendo os parágrafos abaixo
  // normalmente). Dá contexto completo numa frase só: vaga, empresa, local, modalidade.
  const resumoParaVoz = t.vagas.resumoParaVoz(vaga.titulo, nomeEmpresa, local || t.vagas.localNaoInformado, modalidade);

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
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
                <span
                  className="inline-flex items-center gap-0.5 text-primary"
                  title={t.comum.empresaVerificadaTitulo}
                >
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  <span className="sr-only">{t.comum.empresaVerificada}</span>
                </span>
              )}
              {vaga.contrato ? <span>· {t.vagas.contrato[vaga.contrato] ?? vaga.contrato}</span> : null}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" /> {modalidade}
              {local ? ` · ${local}` : ""}
            </p>
            <p className="mt-3 line-clamp-2 text-sm">{vaga.descricao}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {vaga.publicoAlvo && vaga.publicoAlvo !== "geral" && (
                <li>
                  <Badge className="font-medium">{t.vagas.publicoAlvoCurto[vaga.publicoAlvo]}</Badge>
                </li>
              )}
              {(vaga.recursosAcessibilidade ?? [])
                .filter((r) => r !== "outro")
                .slice(0, 3)
                .map((recurso) => {
                  const Icone = ICONE_RECURSO_ACESSIBILIDADE[recurso];
                  return (
                    <li key={recurso}>
                      <Badge variant="outline" className="gap-1 font-medium">
                        <Icone className="size-3.5" aria-hidden="true" />
                        {t.vagas.recursos[recurso]}
                      </Badge>
                    </li>
                  );
                })}
              <li>
                <Badge variant="secondary" className="font-medium">
                  {t.status[vaga.status as keyof typeof t.status] ?? vaga.status}
                </Badge>
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Button asChild className="min-h-12 flex-1 sm:flex-none">
              <Link to="/vaga/$vagaId" params={{ vagaId: vaga.id }}>
                {tc.verVaga}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="min-h-12 shrink-0"
              aria-pressed={favoritada}
              aria-label={favoritada ? tc.removerFavorito : tc.favoritar}
              disabled={favoritando}
              onClick={onFavoritar}
            >
              <Heart
                className={cn("size-4", favoritada && "fill-primary text-primary")}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
