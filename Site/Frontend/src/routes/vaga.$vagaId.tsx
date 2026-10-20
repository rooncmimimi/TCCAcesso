import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Building2, Heart, MapPin, MessagesSquare, MoreVertical } from "lucide-react";
import { ICONE_RECURSO_ACESSIBILIDADE } from "@/components/dashboard/constantesVaga";

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
import { localeDoIdioma, metaPagina, obterIdioma, dic, useT } from "@/i18n";

export const Route = createFileRoute("/vaga/$vagaId")({
  head: () => ({
    meta: [
      ...metaPagina(dic().vagasPagina.detalhe.meta).meta,
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetalheVaga,
});

function DetalheVaga() {
  const t = useT();
  const td = t.vagasPagina.detalhe;
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
      toast.success(td.candidaturaOk);
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
      toast.success(resultado.favoritada ? t.vagasPagina.lista.favoritada : t.vagasPagina.lista.removidaFavoritos);
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
    onError: (erro) => toast.error(extrairMensagemErro(erro, td.erroConversa)),
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
          <h1 className="text-xl font-bold">{td.naoEncontrada}</h1>
          <p className="text-sm text-muted-foreground">
            {td.naoEncontradaTexto}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              {t.comum.tentarNovamente}
            </Button>
            <Button asChild>
              <Link to="/vagas">{td.verTodas}</Link>
            </Button>
          </div>
        </div>
      </EstruturaApp>
    );
  }

  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? t.vagasPagina.card.empresa;
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const ehDonoDaVaga = vaga.empresa?.usuario?.id === usuario?.id;

  return (
    <EstruturaApp>
      <Link
        to="/vagas"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {td.voltar}
      </Link>

      <article className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-extrabold">{vaga.titulo}</h1>
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
            <span className="inline-flex items-center gap-1 font-medium text-primary" title={t.comum.empresaVerificadaTitulo}>
              <BadgeCheck className="size-4" aria-hidden="true" /> {td.verificada}
            </span>
          )}
          {local && (
            <>
              <span aria-hidden="true">·</span>
              <MapPin className="size-4" aria-hidden="true" /> {local}
            </>
          )}
          <span aria-hidden="true">·</span> {t.vagas.modalidade[vaga.modalidade] ?? vaga.modalidade}
          {vaga.contrato && (
            <>
              <span aria-hidden="true">·</span> {t.vagas.contrato[vaga.contrato] ?? vaga.contrato}
            </>
          )}
        </p>

        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <Badge variant="secondary" className="font-medium">
              {t.status[vaga.status as keyof typeof t.status] ?? vaga.status}
            </Badge>
          </li>
          {vaga.publicoAlvo && vaga.publicoAlvo !== "geral" && (
            <li>
              <Badge className="font-medium">{t.vagas.publicoAlvoCurto[vaga.publicoAlvo]}</Badge>
            </li>
          )}
          {vaga.salario != null && vaga.salario !== "" && (
            <li>
              <Badge variant="outline" className="font-medium">
                {td.salario}{" "}
                {typeof vaga.salario === "number"
                  ? vaga.salario.toLocaleString(localeDoIdioma(obterIdioma()), { style: "currency", currency: "BRL" })
                  : vaga.salario}
              </Badge>
            </li>
          )}
        </ul>

        {ehDonoDaVaga ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {td.suaVaga}{" "}
            <Link to="/dashboard/empresa" className="font-semibold text-primary underline">
              {td.gerenciar}
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
                {jaCandidatado ? td.candidaturaEnviada : candidatar.isPending ? t.comum.enviando : td.candidatar}
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
                  {favoritada ? td.favoritada : td.favoritar}
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
                  {conversar.isPending ? td.abrindo : td.conversar}
                </Button>
              )}
            </div>

            {!ehCandidato && (
              <p className="mt-3 text-sm text-muted-foreground">
                {td.entreParaCandidatar}
              </p>
            )}
          </>
        )}

        <Card className="mt-6 shadow-none">
          <CardContent className="space-y-6 p-6">
            <section>
              <h2 className="text-lg font-bold">{td.descricao}</h2>
              <p className="mt-2 whitespace-pre-line text-sm">{vaga.descricao}</p>
            </section>

            {vaga.requisitos && (
              <section>
                <h2 className="text-lg font-bold">{td.requisitos}</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{vaga.requisitos}</p>
              </section>
            )}

            {vaga.beneficios && (
              <section>
                <h2 className="text-lg font-bold">{td.beneficios}</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{vaga.beneficios}</p>
              </section>
            )}

            {(vaga.recursosAcessibilidade?.length ?? 0) > 0 && (
              <section>
                <h2 className="text-lg font-bold">{td.recursos}</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {vaga.recursosAcessibilidade!.map((recurso) => {
                    const Icone = ICONE_RECURSO_ACESSIBILIDADE[recurso];
                    return (
                      <li key={recurso}>
                        <Badge variant="outline" className="gap-1.5 py-1.5 font-medium">
                          <Icone className="size-4" aria-hidden="true" />
                          {t.vagas.recursos[recurso]}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {vaga.acessibilidade && (
              <section>
                <h2 className="text-lg font-bold">{td.detalhesAcessibilidade}</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{vaga.acessibilidade}</p>
              </section>
            )}

            {vaga.cargaHoraria && (
              <section>
                <h2 className="text-lg font-bold">{td.cargaHoraria}</h2>
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
  const t = useT();
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
            aria-label={t.vagasPagina.detalhe.maisOpcoes}
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDenunciando(true)}
          >
            {t.vagasPagina.detalhe.denunciar}
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
