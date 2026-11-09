import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditarPerfilDialog } from "@/components/perfil/EditarPerfilDialog";
import { EditarEmpresaDialog } from "@/components/perfil/EditarEmpresaDialog";
import { SecaoTrocarEmail } from "@/components/configuracoes/SecaoTrocarEmail";
import { SecaoContaPerigo } from "@/components/configuracoes/SecaoContaPerigo";
import { useSessao } from "@/hooks/useSessao";
import { perfilService } from "@/services/perfil.service";
import { empresasService } from "@/services/empresas.service";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";
import type { ChaveBase } from "@/i18n/dicionarios";

export const Route = createFileRoute("/configuracoes/conta")({
  head: () => ({
    meta: [
      { title: textoDaPagina("configuracoes.conta.contaAcesso") },
      { name: "description", content: textoDaPagina("configuracoes.conta.gerencieOsDadosDaSuaConta") },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Conta />
    </GuardaAcesso>
  ),
});

function formatarDataLonga(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

const RUBRICA_TIPO: Record<string, ChaveBase> = {
  candidato: "configuracoes.conta.pessoaCandidata",
  empresa: "admin.denunciasTabela.empresa",
  administrador: "configuracoes.conta.administrador",
};

function Conta() {
  const { t } = useIdioma();
  const { usuario } = useSessao();

  const { data: candidato } = useQuery({
    queryKey: ["meu-candidato"],
    queryFn: () => perfilService.meuCandidato(),
    enabled: usuario?.tipo === "candidato",
  });

  const { data: empresa } = useQuery({
    queryKey: ["minha-empresa"],
    queryFn: () => empresasService.minhaEmpresa(),
    enabled: usuario?.tipo === "empresa",
  });

  return (
    <EstruturaApp>
      <Link
        to="/configuracoes"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t("configuracoes.conta.voltarParaConfiguracoes")}
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{t("configuracoes.conta.conta")}</h1>
      <p className="text-sm text-muted-foreground sm:text-base">{t("configuracoes.conta.seusDadosDeAcessoEInformacoes")}</p>

      <div className="mt-6 space-y-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">{t("configuracoes.conta.informacoesDaConta")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{t("configuracoes.conta.nome")}</dt>
                <dd className="font-medium">{usuario?.nome}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{t("configuracoes.conta.tipoDeConta")}</dt>
                <dd className="font-medium">{usuario ? RUBRICA_TIPO[usuario.tipo] ?? usuario.tipo : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{t("configuracoes.conta.contaCriadaEm")}</dt>
                <dd className="font-medium">{formatarDataLonga(usuario?.criadoEm ?? usuario?.criadoEm)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">{t("configuracoes.conta.ultimoAcesso")}</dt>
                <dd className="font-medium">{formatarDataLonga(usuario?.ultimoLogin)}</dd>
              </div>
            </dl>

            {usuario?.tipo === "empresa" && empresa ? (
              <EditarEmpresaDialog empresa={empresa}>
                <Button variant="outline" className="min-h-11 gap-2">
                  <Pencil className="size-4" aria-hidden="true" /> {t("configuracoes.conta.editarDadosDaEmpresa")}
                </Button>
              </EditarEmpresaDialog>
            ) : usuario?.tipo === "candidato" ? (
              <EditarPerfilDialog candidato={candidato}>
                <Button variant="outline" className="min-h-11 gap-2">
                  <Pencil className="size-4" aria-hidden="true" /> {t("configuracoes.conta.editarNomeTelefoneELocalidade")}
                </Button>
              </EditarPerfilDialog>
            ) : null}
          </CardContent>
        </Card>

        <SecaoTrocarEmail />

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">{t("login.senha")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/configuracoes/senha">{t("configuracoes.conta.alterarSenha")}</Link>
            </Button>
          </CardContent>
        </Card>

        <SecaoContaPerigo />
      </div>
    </EstruturaApp>
  );
}
