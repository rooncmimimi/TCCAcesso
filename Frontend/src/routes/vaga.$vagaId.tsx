import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Building2, Heart, MapPin, MessagesSquare } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/contexts/SessionContext";
import vagasService from "@/services/vagas.service";
import mensagensService from "@/services/mensagens.service";
import dashboardService, { candidaturasService } from "@/services/dashboard.service";
import { extrairMensagemErro } from "@/services/api";
import { cn } from "@/lib/utils";

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
  const { user } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const ehCandidato = user?.tipo === "candidato";

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
      toast.success("Candidatura enviada com sucesso.");
      void queryClient.invalidateQueries({ queryKey: ["candidaturas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const favoritar = useMutation({
    mutationFn: () => vagasService.favoritar(vagaId),
    onSuccess: (resultado) => {
      toast.success(resultado.favoritada ? "Vaga favoritada." : "Vaga removida dos favoritos.");
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "favoritos"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const conversar = useMutation({
    mutationFn: () => mensagensService.criarConversa({ empresaId: vaga?.empresa?.id }),
    onSuccess: async (conversa) => {
      await queryClient.invalidateQueries({ queryKey: ["conversas"] });
      void navigate({ to: "/mensagens", search: { conversaId: conversa.id } });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível abrir a conversa.")),
  });

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-64 w-full rounded-xl" />
      </AppShell>
    );
  }

  if (isError || !vaga) {
    return (
      <AppShell>
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 p-6">
          <h1 className="text-xl font-bold">Vaga não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            Esta vaga pode ter sido encerrada ou removida pela empresa.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
            <Button asChild>
              <Link to="/vagas">Ver todas as vagas</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const nomeEmpresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa";
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const ehDonoDaVaga = vaga.empresa?.usuario?.id === user?.id;

  return (
    <AppShell>
      <Link
        to="/vagas"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para as vagas
      </Link>

      <article className="mt-4">
        <h1 className="text-3xl font-extrabold">{vaga.titulo}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="size-4" aria-hidden="true" /> {nomeEmpresa}
          {local && (
            <>
              <span aria-hidden="true">·</span>
              <MapPin className="size-4" aria-hidden="true" /> {local}
            </>
          )}
          <span aria-hidden="true">·</span> {vaga.modalidade}
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
          {vaga.exclusivaPcd && (
            <li>
              <Badge className="font-medium">Exclusiva PCD</Badge>
            </li>
          )}
          {vaga.salario != null && vaga.salario !== "" && (
            <li>
              <Badge variant="outline" className="font-medium">
                Salário: {typeof vaga.salario === "number"
                  ? vaga.salario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : vaga.salario}
              </Badge>
            </li>
          )}
        </ul>

        {ehDonoDaVaga ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Esta é uma das suas vagas.{" "}
            <Link to="/dashboard/empresa" className="font-semibold text-primary underline">
              Gerenciar pelo painel da empresa
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="min-h-12"
                disabled={!ehCandidato || jaCandidatado || candidatar.isPending || vaga.status !== "Aberta"}
                onClick={() => candidatar.mutate()}
              >
                {jaCandidatado ? "Candidatura enviada" : candidatar.isPending ? "Enviando…" : "Candidatar-se"}
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
                  {favoritada ? "Favoritada" : "Favoritar"}
                </Button>
              )}
              {ehCandidato && vaga.empresa?.id && (
                <Button
                  variant="outline"
                  className="min-h-12"
                  disabled={conversar.isPending}
                  onClick={() => conversar.mutate()}
                >
                  <MessagesSquare className="size-4" aria-hidden="true" />
                  {conversar.isPending ? "Abrindo…" : "Conversar com a empresa"}
                </Button>
              )}
            </div>

            {!ehCandidato && (
              <p className="mt-3 text-sm text-muted-foreground">
                Entre com uma conta de candidato para se candidatar a esta vaga.
              </p>
            )}
          </>
        )}

        <Card className="mt-6 shadow-none">
          <CardContent className="space-y-6 p-6">
            <section>
              <h2 className="text-lg font-bold">Descrição</h2>
              <p className="mt-2 whitespace-pre-line text-sm">{vaga.descricao}</p>
            </section>

            {vaga.requisitos && (
              <section>
                <h2 className="text-lg font-bold">Requisitos</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{vaga.requisitos}</p>
              </section>
            )}

            {vaga.beneficios && (
              <section>
                <h2 className="text-lg font-bold">Benefícios</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{vaga.beneficios}</p>
              </section>
            )}

            {vaga.acessibilidade && (
              <section>
                <h2 className="text-lg font-bold">Recursos de acessibilidade</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{vaga.acessibilidade}</p>
              </section>
            )}

            {vaga.cargaHoraria && (
              <section>
                <h2 className="text-lg font-bold">Carga horária</h2>
                <p className="mt-2 text-sm">{vaga.cargaHoraria}</p>
              </section>
            )}
          </CardContent>
        </Card>
      </article>
    </AppShell>
  );
}
