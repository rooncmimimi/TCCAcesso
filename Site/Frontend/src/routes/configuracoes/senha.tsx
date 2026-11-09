import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, KeyRound, Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { autenticacaoService } from "@/services/autenticacao.service";
import { extrairMensagemErro } from "@/services/api";
import { useSessao } from "@/hooks/useSessao";
import { useIdioma } from "@/hooks/useIdioma";
import { Frase } from "@/i18n/Frase";
import { textoDaPagina } from "@/i18n/textoDaPagina";
import type { TFuncao } from "@/contexts/IdiomaContext";
import { criarRegrasDeSenha } from "@/lib/regrasDeSenha";

/** O esquema nasce do idioma atual: as mensagens de erro saem na língua da tela. */
const criarEsquema = (t: TFuncao) =>
  z
    .object({
      senhaAtual: z.string().min(1, t("validacao.informeSenhaAtual")),
      novaSenha: criarRegrasDeSenha(t),
      confirmarSenha: z.string().min(1, t("validacao.confirmeNovaSenha")),
    })
    .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
      message: t("validacao.senhasNaoCoincidem"),
      path: ["confirmarSenha"],
    });

type Formulario = z.infer<ReturnType<typeof criarEsquema>>;

export const Route = createFileRoute("/configuracoes/senha")({
  head: () => ({
    meta: [
      { title: textoDaPagina("configuracoes.senha.alterarSenhaAcesso") },
      { name: "description", content: textoDaPagina("configuracoes.senha.altereASenhaDaSuaContaAcesso") },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <PaginaSenha />
    </GuardaAcesso>
  ),
});

/** Conta que entra só pelo Google ainda não tem senha: aqui ela **define** uma, em vez de alterar. */
function PaginaSenha() {
  const { usuario } = useSessao();

  return usuario?.temSenha === false ? <DefinirSenha email={usuario.email} /> : <AlterarSenha />;
}

/**
 * Definir a primeira senha de uma conta que entra com o Google.
 *
 * Não pede "senha atual" (não existe) e não aceita a senha digitada aqui direto: a prova de que a
 * pessoa é dona da conta é o **e-mail**. Reaproveita a recuperação de senha, que manda ao endereço da
 * conta um link e um código; ao definir a senha, todas as sessões se encerram, como em qualquer
 * troca de senha, e a pessoa entra de novo pelo Google ou com a senha nova.
 */
function DefinirSenha({ email }: { email: string }) {
  const { t } = useIdioma();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setEnviando(true);
    try {
      await autenticacaoService.esqueciSenha(email);
      setEnviado(true);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t("configuracoes.senha.naoFoiPossivelEnviarOEMail")));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <EstruturaApp>
      <Link
        to="/configuracoes/conta"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t("auth.voltar")}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("configuracoes.senha.definirSenha")}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t("configuracoes.senha.suaContaEntraComOGoogleComUma")}
          </p>
        </div>
      </div>

      <Card className="mt-6 max-w-lg shadow-none">
        <CardContent className="space-y-4 p-5 sm:p-6">
          {enviado ? (
            <div role="status" className="space-y-3">
              <p className="flex items-center gap-2 font-semibold">
                <MailCheck className="size-5 text-primary" aria-hidden="true" /> {t("configuracoes.senha.eMailEnviado")}
              </p>
              <p className="text-sm text-muted-foreground">
                <Frase
                  chave="configuracoes.senha.enviamosUmLinkPara"
                  vars={{ email }}
                  partes={[(texto) => <span className="font-medium text-foreground">{texto}</span>]}
                />
              </p>
              <p className="text-sm text-muted-foreground">
                {t("configuracoes.senha.prefereDigitarOCodigoQueVeioNo")}{" "}
                <Link
                  to="/redefinir-senha"
                  search={{ email }}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  {t("configuracoes.senha.usarOCodigo")}
                </Link>
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                <Frase
                  chave="configuracoes.senha.vamosMandarUmLinkPara"
                  vars={{ email }}
                  partes={[(texto) => <span className="font-medium text-foreground">{texto}</span>]}
                />
              </p>
              <Button type="button" className="min-h-12 w-full text-base" disabled={enviando} onClick={enviar}>
                {enviando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> {t("comentario.enviando")}
                  </>
                ) : (
                  t("configuracoes.senha.enviarEMailParaDefinirASenha")
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </EstruturaApp>
  );
}

function AlterarSenha() {
  const { t } = useIdioma();
  const navigate = useNavigate();
  const { sair } = useSessao();
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(useMemo(() => criarEsquema(t), [t])),
    defaultValues: { senhaAtual: "", novaSenha: "", confirmarSenha: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await autenticacaoService.alterarSenha(valores.senhaAtual, valores.novaSenha);
      reset();
      // O backend encerra todas as sessões ao trocar a senha, inclusive esta, então a tela sai da
      // conta, como na redefinição por código.
      await sair();
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(t("configuracoes.senha.senhaAlteradaComSucessoEntre"));
      void navigate({ to: "/entrar" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, t("configuracoes.senha.naoFoiPossivelAlterarASenha"));
      setError("senhaAtual", { message: mensagem });
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  });

  return (
    <EstruturaApp>
      <Link
        to="/configuracoes/conta"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t("auth.voltar")}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{t("configuracoes.senha.alterarSenha")}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t("configuracoes.senha.depoisDeTrocarASenhaVoce")}
          </p>
        </div>
      </div>

      <Card className="mt-6 max-w-lg shadow-none">
        <CardContent className="p-5 sm:p-6">
          <form className="space-y-4" onSubmit={aoEnviar} noValidate>
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">{t("configuracoes.senha.senhaAtual")}</Label>
              <PasswordInput
                id="senhaAtual"
                autoComplete="current-password"
                className="min-h-12"
                aria-invalid={Boolean(errors.senhaAtual)}
                aria-describedby={errors.senhaAtual ? "senhaAtual-erro" : undefined}
                {...register("senhaAtual")}
              />
              {errors.senhaAtual && (
                <p id="senhaAtual-erro" role="alert" className="text-sm font-medium text-destructive">
                  {errors.senhaAtual.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="novaSenha">{t("configuracoes.senha.novaSenha")}</Label>
              <PasswordInput
                id="novaSenha"
                autoComplete="new-password"
                className="min-h-12"
                aria-invalid={Boolean(errors.novaSenha)}
                aria-describedby={errors.novaSenha ? "novaSenha-erro" : "novaSenha-dica"}
                {...register("novaSenha")}
              />
              {errors.novaSenha ? (
                <p id="novaSenha-erro" role="alert" className="text-sm font-medium text-destructive">
                  {errors.novaSenha.message}
                </p>
              ) : (
                <p id="novaSenha-dica" className="text-xs text-muted-foreground">
                  {t("configuracoes.senha.minimoDe8CaracteresCom")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">{t("configuracoes.senha.confirmarNovaSenha")}</Label>
              <PasswordInput
                id="confirmarSenha"
                autoComplete="new-password"
                className="min-h-12"
                aria-invalid={Boolean(errors.confirmarSenha)}
                aria-describedby={errors.confirmarSenha ? "confirmarSenha-erro" : undefined}
                {...register("confirmarSenha")}
              />
              {errors.confirmarSenha && (
                <p id="confirmarSenha-erro" role="alert" className="text-sm font-medium text-destructive">
                  {errors.confirmarSenha.message}
                </p>
              )}
            </div>

            <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" /> {t("configuracoes.senha.salvando")}
                </>
              ) : (
                t("configuracoes.senha.salvarNovaSenha")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </EstruturaApp>
  );
}
