import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import { ControleDeTraducao } from "@/components/traducao/ControleDeTraducao";
import { useTraducao } from "@/hooks/useTraducao";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Building2, Heart, MapPin, MessagesSquare, MoreVertical } from "lucide-react";
import {
  ICONE_RECURSO_ACESSIBILIDADE,
} from "@/components/dashboard/constantesVaga";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DenunciarDialog } from "@/components/moderacao/DenunciarDialog";
import { useSessao } from "@/hooks/useSessao";
import vagasService from "@/services/vagas.service";
import mensagensService from "@/services/mensagens.service";
import dashboardService, { candidaturasService } from "@/services/dashboard.service";
import { extrairMensagemErro } from "@/services/api";
import { cn } from "@/lib/utils";
import { ResumoVagaSimples } from "@/components/vagas/ResumoVagaSimples";
import { TextoOuvivel } from "@/components/acessibilidade/TextoOuvivel";

export const Route = createFileRoute("/vaga/$vagaId")({
  head: () => ({
    meta: [
      { title: "Detalhes da vaga — ACESSO" },
      {
        name: "description",
        content: "Veja requisitos, benefícios e recursos de acessibilidade da vaga e candidate-se.",
      },
      { property: "og:title", content: "Detalhes da vaga — ACESSO" },
      { property: "og:description", content: "Requisitos, benefícios e acessibilidade da vaga." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetalheVaga,
});

function DetalheVaga() {
  const { vagaId } = Route.useParams();
  const { usuario } = useSessao();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const ehCandidato = usuario?.tipo === "candidato";

  const { data: vaga, isLoading, isError, refetch } = useQuery({
    queryKey: ["vaga", vagaId],
    queryFn: () => vagasService.detalhar(vagaId),
  });

  const { data: minhas } = useQuery({
    queryKey: ["candidaturas", "minhas"],
    queryFn: () => candidaturasService.minhas({ limit: 100 }),
    enabled: ehCandidato,
  });

  const { data: favoritos } = useQuery({
    queryKey: ["dashboard", "favoritos"],
    queryFn: () => dashboardService.favoritos({ limit: 100 }),
    enabled: ehCandidato,
  });

  const jaCandidatado = (minhas?.dados ?? []).some((c) => c.vaga?.id === vagaId);
  const favoritada = (favoritos?.dados ?? []).some((v) => v.id === vagaId);

  const candidatar = useMutation({
    mutationFn: () => vagasService.candidatar(vagaId),
    onSuccess: () => {
      toast.success(t("vagaDetalhe.candidaturaSucesso"));
      // O widget "Minhas candidaturas recentes" do painel (CandidaturasRecentes.tsx)
      // usa o mesmo prefixo ["candidaturas","minhas"]: invalidar aqui já
      // cobre as duas telas, mais o card de métricas do painel.
      void queryClient.invalidateQueries({ queryKey: ["candidaturas", "minhas"] });
      void queryClient.invalidateQueries({ queryKey: ["metricas-candidato"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const favoritar = useMutation({
    mutationFn: () => vagasService.favoritar(vagaId),
    onSuccess: (resultado) => {
      toast.success(resultado.favoritada ? t("vagas.favoritada") : t("vagas.favoritadaRemovida"));
      // Mesma regra do favoritar em `vagas.tsx` (ver o comentário lá): há duas chaves para o mesmo
      // dado, e as duas são invalidadas.
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "favoritos"] });
      void queryClient.invalidateQueries({ queryKey: ["vagas-favoritas"] });
      void queryClient.invalidateQueries({ queryKey: ["metricas-candidato"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const conversar = useMutation({
    mutationFn: () => mensagensService.criarConversa({ usuarioId: vaga?.empresa?.usuario?.id }),
    onSuccess: async (conversa) => {
      await queryClient.invalidateQueries({ queryKey: ["conversas"] });
      void navigate({ to: "/mensagens", search: { conversaId: conversa.id } });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("vagaDetalhe.conversaFalha"))),
  });

  const { t, locale } = useIdioma();
  const traducao = useTraducao({
    titulo: vaga?.titulo ?? "",
    descricao: vaga?.descricao ?? "",
    requisitos: vaga?.requisitos ?? "",
    beneficios: vaga?.beneficios ?? "",
    acessibilidade: vaga?.acessibilidade ?? "",
  });

  if (isLoading) {
    return (
      <EstruturaApp>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-64 w-full rounded-xl" />
      </EstruturaApp>
    );
  }

  if (isError || !vaga) {
    return (
      <EstruturaApp>
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 p-6">
          <h1 className="text-xl font-bold">{t("vagaDetalhe.naoEncontrada")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("vagaDetalhe.naoEncontradaTexto")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              {t("vagas.tentarNovamente")}
            </Button>
            <Button asChild>
              <Link to="/vagas">{t("vagaDetalhe.verTodas")}</Link>
            </Button>
          </div>
        </div>
      </EstruturaApp>
    );
  }

  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? t("vaga.empresa");
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const ehDonoDaVaga = vaga.empresa?.usuario?.id === usuario?.id;

  return (
    <EstruturaApp>
      <Link
        to="/vagas"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t("vagaDetalhe.voltar")}
      </Link>

      <article className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-extrabold">{traducao.texto("titulo")}</h1>
          {usuario && !ehDonoDaVaga && (
            <DenunciarVagaMenu
              vagaId={vaga.id}
              titulo={vaga.titulo}
              autorUsuarioId={vaga.empresa?.usuario?.id}
              autorNomeExibicao={nomeEmpresa}
            />
          )}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="size-4" aria-hidden="true" />{" "}
          {vaga.empresa?.usuario?.id ? (
            <Link
              to="/perfil/$usuarioId"
              params={{ usuarioId: vaga.empresa.usuario.id }}
              className="font-medium text-foreground hover:underline focus-visible:underline"
            >
              {nomeEmpresa}
            </Link>
          ) : (
            nomeEmpresa
          )}
          {vaga.empresa?.empresaVerificada && (
            <span className="inline-flex items-center gap-1 font-medium text-primary" title={t("vaga.empresaVerificadaTitulo")}>
              <BadgeCheck className="size-4" aria-hidden="true" /> {t("vaga.verificada")}
            </span>
          )}
          {local && (
            <>
              <span aria-hidden="true">·</span>
              <MapPin className="size-4" aria-hidden="true" /> {local}
            </>
          )}
          <span aria-hidden="true">·</span> {t(`vaga.modalidade.${vaga.modalidade}` as ChaveBase)}
          {vaga.contrato && (
            <>
              <span aria-hidden="true">·</span> {vaga.contrato}
            </>
          )}
        </p>

        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <Badge variant="secondary" className="font-medium">
              {vaga.status}
            </Badge>
          </li>
          {vaga.publicoAlvo && vaga.publicoAlvo !== "geral" && (
            <li>
              <Badge className="font-medium">{t(`vaga.publicoCurto.${vaga.publicoAlvo}` as ChaveBase)}</Badge>
            </li>
          )}
          {vaga.salario != null && vaga.salario !== "" && (
            <li>
              <Badge variant="outline" className="font-medium">
                {t("vagaDetalhe.salario", {
                  valor:
                    typeof vaga.salario === "number"
                      ? vaga.salario.toLocaleString(locale, { style: "currency", currency: "BRL" })
                      : vaga.salario,
                })}
              </Badge>
            </li>
          )}
        </ul>

        {ehDonoDaVaga ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {t("vagaDetalhe.suaVaga")}{" "}
            <Link to="/dashboard/empresa" className="font-semibold text-primary underline">
              {t("vagaDetalhe.gerenciar")}
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="min-h-12"
                disabled={!ehCandidato || jaCandidatado || candidatar.isPending || vaga.status !== "aberta"}
                onClick={() => candidatar.mutate()}
              >
                {jaCandidatado ? t("vagaDetalhe.candidaturaEnviada") : candidatar.isPending ? t("vagaDetalhe.enviando") : t("vagaDetalhe.candidatar")}
              </Button>
              {ehCandidato && (
                <Button
                  variant="outline"
                  className="min-h-12"
                  aria-pressed={favoritada}
                  disabled={favoritar.isPending}
                  onClick={() => favoritar.mutate()}
                >
                  <Heart
                    className={cn("size-4", favoritada && "fill-primary text-primary")}
                    aria-hidden="true"
                  />
                  {favoritada ? t("vagaDetalhe.favoritadaBotao") : t("vagaDetalhe.favoritarBotao")}
                </Button>
              )}
              {ehCandidato && vaga.empresa?.usuario?.id && (
                <Button
                  variant="outline"
                  className="min-h-12"
                  disabled={conversar.isPending}
                  onClick={() => conversar.mutate()}
                >
                  <MessagesSquare className="size-4" aria-hidden="true" />
                  {conversar.isPending ? t("vagaDetalhe.abrindo") : t("vagaDetalhe.conversar")}
                </Button>
              )}
            </div>

            {!ehCandidato && (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("vagaDetalhe.entreCandidato")}
              </p>
            )}
          </>
        )}

        <ControleDeTraducao traducao={traducao} conteudo="vaga" className="mt-3" />

        <ResumoVagaSimples vaga={vaga} />

        <Card className="mt-6 shadow-none">
          <CardContent className="space-y-6 p-6">
            <section>
              <h2 className="text-lg font-bold">{t("vagaDetalhe.descricao")}</h2>
              <TextoOuvivel rotulo="Ouvir a descrição da vaga" className="mt-2">
                <p className="whitespace-pre-line text-sm">{traducao.texto("descricao")}</p>
              </TextoOuvivel>
            </section>

            {vaga.requisitos && (
              <section>
                <h2 className="text-lg font-bold">{t("vagaDetalhe.requisitos")}</h2>
                <TextoOuvivel rotulo="Ouvir os requisitos da vaga" className="mt-2">
                  <p className="whitespace-pre-line text-sm">{traducao.texto("requisitos")}</p>
                </TextoOuvivel>
              </section>
            )}

            {vaga.beneficios && (
              <section>
                <h2 className="text-lg font-bold">{t("vagaDetalhe.beneficios")}</h2>
                <TextoOuvivel rotulo="Ouvir os benefícios da vaga" className="mt-2">
                  <p className="whitespace-pre-line text-sm">{traducao.texto("beneficios")}</p>
                </TextoOuvivel>
              </section>
            )}

            {(vaga.recursosAcessibilidade?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-lg font-bold">{t("vagaDetalhe.recursos")}</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {vaga.recursosAcessibilidade!.map((recurso) => {
                    const Icone = ICONE_RECURSO_ACESSIBILIDADE[recurso];
                    return (
                      <li key={recurso}>
                        <Badge variant="outline" className="gap-1.5 py-1.5 font-medium">
                          <Icone className="size-4" aria-hidden="true" />
                          {t(`vaga.recurso.${recurso}` as ChaveBase)}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {vaga.acessibilidade && (
              <section>
                <h2 className="text-lg font-bold">{t("vagaDetalhe.detalhesAcessibilidade")}</h2>
                <TextoOuvivel rotulo="Ouvir os detalhes de acessibilidade da vaga" className="mt-2">
                  <p className="whitespace-pre-line text-sm">{traducao.texto("acessibilidade")}</p>
                </TextoOuvivel>
              </section>
            )}

            {vaga.cargaHoraria && (
              <section>
                <h2 className="text-lg font-bold">{t("vagaDetalhe.cargaHoraria")}</h2>
                <p className="mt-2 text-sm">{vaga.cargaHoraria}</p>
              </section>
            )}
          </CardContent>
        </Card>
      </article>
    </EstruturaApp>
  );
}

function DenunciarVagaMenu({
  vagaId,
  titulo,
  autorUsuarioId,
  autorNomeExibicao,
}: {
  vagaId: string;
  titulo: string;
  autorUsuarioId?: string;
  autorNomeExibicao?: string;
}) {
  const { t } = useIdioma();
  const [denunciando, setDenunciando] = useState(false);
  // Foco volta pra este botão ao fechar o DenunciarDialog (ver comentário
  // em DenunciarDialog.tsx sobre a disputa de foco entre o menu que fecha e
  // o diálogo que abre).
  const gatilhoMenuRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={gatilhoMenuRef}
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 shrink-0"
            aria-label={t("vagaDetalhe.maisOpcoes")}
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDenunciando(true)}
          >
            {t("vagaDetalhe.denunciar")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DenunciarDialog
        open={denunciando}
        onOpenChange={setDenunciando}
        entidadeTipo="vaga"
        entidadeId={vagaId}
        nomeExibicao={titulo}
        autorUsuarioId={autorUsuarioId}
        autorNomeExibicao={autorNomeExibicao}
        aoFecharDevolverFoco={() => gatilhoMenuRef.current?.focus()}
      />
    </>
  );
}
