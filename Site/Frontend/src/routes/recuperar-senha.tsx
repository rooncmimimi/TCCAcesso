import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import autenticacaoService from "@/services/autenticacao.service";
import { extrairMensagemErro } from "@/services/api";
import { metaPagina, regraEmail, SeletorIdioma, dic, useT, type Dicionario } from "@/i18n";

function criarEsquema(v: Dicionario["validacao"]) {
  return z.object({ email: regraEmail(v) });
}

type Formulario = z.infer<ReturnType<typeof criarEsquema>>;

export const Route = createFileRoute("/recuperar-senha")({
  head: () => metaPagina(dic().auth.recuperar.meta),
  component: RecuperarSenha,
});

function RecuperarSenha() {
  const t = useT();
  const tr = t.auth.recuperar;
  const esquema = useMemo(() => criarEsquema(t.validacao), [t]);
  const [enviando, setEnviando] = useState(false);
  // O backend responde de forma genérica (não revela se o e-mail existe), então só resta mostrar
  // "e-mail enviado". A tela não leva a `/redefinir-senha`: o próximo passo é abrir o link recebido
  // por e-mail.
  const [enviado, setEnviado] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { email: "" } });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await autenticacaoService.esqueciSenha(valores.email);
      setEnviado(true);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, tr.erro));
    } finally {
      setEnviando(false);
    }
  });

  return (
    <AutenticacaoLayout>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" aria-label={t.auth.voltarInicioAria} className="inline-flex">
            <Logo />
          </Link>
          <SeletorIdioma compacto id="seletor-idioma-auth" />
        </div>
        <Card className="shadow-card">
          <CardContent className="p-6">
            {enviado ? (
              <div role="status" aria-live="polite" className="space-y-4 text-center">
                <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
                <h1 className="text-2xl font-extrabold">{tr.verifique}</h1>
                <p className="text-sm text-muted-foreground">
                  {tr.enviado}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tr.noApp}{" "}
                  <Link to="/redefinir-senha" className="font-semibold text-primary underline">
                    {tr.usarCodigo}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold">{tr.titulo}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tr.texto}
                </p>
                <form className="mt-6 space-y-4" onSubmit={aoEnviar} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.auth.email}</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="min-h-12"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-erro" : undefined}
                      {...register("email")}
                    />
                    {errors.email && (
                      <p id="email-erro" role="alert" className="text-sm font-medium text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
                    {enviando ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden="true" /> {t.comum.enviando}
                      </>
                    ) : (
                      <>
                        {tr.enviarLink} <ArrowRight aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
                <p className="mt-6 text-sm text-muted-foreground">
                  {tr.jaTemCodigo}{" "}
                  <Link to="/redefinir-senha" className="font-semibold text-primary underline">
                    {tr.redefinir}
                  </Link>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tr.lembrou}{" "}
                  <Link to="/entrar" className="font-semibold text-primary underline">
                    {t.comum.entrar}
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
    </AutenticacaoLayout>
  );
}
