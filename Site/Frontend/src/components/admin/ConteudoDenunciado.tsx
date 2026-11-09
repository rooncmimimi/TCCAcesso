import { Link } from "@tanstack/react-router";

import type { EntidadeDenunciaTipo } from "@/services/denuncia.service";
import { useIdioma } from "@/hooks/useIdioma";

type Previa = Record<string, unknown> | null | undefined;
type Pessoa = { id?: string; nome?: string; tipoUsuario?: string } | null | undefined;

const TIPO_DE_CONTA: Record<string, string> = {
  candidato: "Candidato",
  empresa: "Empresa",
  administrador: "Administrador",
};

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : "");

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function LinkDaConta({ id, nome }: { id?: string; nome?: string }) {
  if (!id) return <>{nome ?? "—"}</>;

  return (
    <Link to="/admin/usuarios/$usuarioId" params={{ usuarioId: id }} className="font-semibold text-primary underline-offset-2 hover:underline">
      {nome ?? "Abrir conta"}
    </Link>
  );
}

function Autor({ autor }: { autor: Pessoa }) {
  const { t } = useIdioma();
  if (!autor) return <>{t("admin.conteudoDenunciado.contaRemovida")}</>;

  return (
    <>
      <LinkDaConta id={autor.id} nome={autor.nome} />
      {autor.tipoUsuario ? ` (${TIPO_DE_CONTA[autor.tipoUsuario] ?? autor.tipoUsuario})` : ""}
    </>
  );
}

/**
 * O conteúdo ou a conta que foi denunciado, em linguagem de gente: quem escreveu, o que está escrito e em que
 * situação está agora, em vez de um dump dos campos. O conteúdo de uma mensagem não passa por aqui: só se abre
 * pelo contexto da conversa (que fica registrado na auditoria).
 */
export function ConteudoDenunciado({ tipo, previa }: { tipo: EntidadeDenunciaTipo; previa: Previa }) {
  const { t } = useIdioma();
  if (!previa) {
    return <p className="mt-2 text-sm text-muted-foreground">{t("admin.conteudoDenunciado.esteConteudoNaoExisteMaisOuJa")}</p>;
  }

  if (tipo === "usuario") {
    return (
      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
        <Campo rotulo={t("admin.conteudoDenunciado.contaDenunciada")}>
          <LinkDaConta id={texto(previa.id)} nome={texto(previa.nome)} />
        </Campo>
        <Campo rotulo={t("admin.conteudoDenunciado.tipoDeConta")}>{TIPO_DE_CONTA[texto(previa.tipoUsuario)] ?? texto(previa.tipoUsuario)}</Campo>
        <Campo rotulo="E-mail">{texto(previa.email)}</Campo>
        <Campo rotulo={t("admin.conteudoDenunciado.situacao")}>{previa.bloqueado ? "Bloqueada" : "Ativa"}</Campo>
      </dl>
    );
  }

  if (tipo === "postagem" || tipo === "comentario") {
    const corpo = tipo === "postagem" ? texto(previa.conteudo) : texto(previa.comentario);

    return (
      <dl className="mt-3 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo={t("admin.conteudoDenunciado.autor")}>
            <Autor autor={previa.autor as Pessoa} />
          </Campo>
          <Campo rotulo={t("admin.conteudoDenunciado.situacao")}>{previa.ativo === false ? "Removida" : "Publicada"}</Campo>
        </div>
        <Campo rotulo={tipo === "postagem" ? "Texto da publicação" : "Texto do comentário"}>
          <blockquote className="whitespace-pre-wrap break-words rounded-lg bg-secondary p-3">
            {corpo || "(sem texto)"}
          </blockquote>
        </Campo>
      </dl>
    );
  }

  if (tipo === "vaga") {
    const empresa = previa.empresa as { nomeFantasia?: string | null; razaoSocial?: string } | null | undefined;

    return (
      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
        <Campo rotulo={t("admin.conteudoDenunciado.vaga")}>{texto(previa.titulo)}</Campo>
        <Campo rotulo={t("vaga.empresa")}>{empresa ? (empresa.nomeFantasia || empresa.razaoSocial) : "Empresa não encontrada"}</Campo>
        <Campo rotulo={t("admin.conteudoDenunciado.situacao")}>{texto(previa.status)}</Campo>
        <Campo rotulo={t("admin.conteudoDenunciado.visibilidade")}>{previa.oculta ? "Oculta pela moderação" : "Visível"}</Campo>
      </dl>
    );
  }

  if (tipo === "empresa") {
    return (
      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
        <Campo rotulo={t("vaga.empresa")}>{texto(previa.nomeFantasia) || texto(previa.razaoSocial)}</Campo>
        <Campo rotulo={t("admin.conteudoDenunciado.razaoSocial")}>{texto(previa.razaoSocial)}</Campo>
        <Campo rotulo={t("admin.conteudoDenunciado.situacaoDoCadastro")}>{texto(previa.statusAprovacao)}</Campo>
      </dl>
    );
  }

  return <p className="mt-2 text-sm text-muted-foreground">{t("admin.conteudoDenunciado.semPreviaDisponivelParaEste")}</p>;
}
