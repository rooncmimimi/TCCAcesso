import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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

const esquema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
});

type Formulario = z.infer<typeof esquema>;

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — ACESSO" },
      { name: "description", content: "Solicite um link para redefinir sua senha do ACESSO." },
    ],
  }),
  component: RecuperarSenha,
});

function RecuperarSenha() {
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
      toast.error(extrairMensagemErro(erro, "Não foi possível solicitar a recuperação de senha."));
    } finally {
      setEnviando(false);
    }
  });

  return (
    <AutenticacaoLayout>
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6">
            {enviado ? (
              <div role="status" aria-live="polite" className="space-y-4 text-center">
                <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
                <h1 className="text-2xl font-extrabold">Verifique seu e-mail</h1>
                <p className="text-sm text-muted-foreground">
                  Se encontrarmos uma conta associada a este endereço, enviaremos um link para redefinir sua senha.
                  Clique nele para continuar.
                </p>
                <p className="text-sm text-muted-foreground">
                  Está no aplicativo ACESSO?{" "}
                  <Link to="/redefinir-senha" className="font-semibold text-primary underline">
                    Usar o código do e-mail
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold">Recuperar senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Informe seu e-mail para receber um link de redefinição de senha.
                </p>
                <form className="mt-6 space-y-4" onSubmit={aoEnviar} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
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
                        <Loader2 className="animate-spin" aria-hidden="true" /> Enviando…
                      </>
                    ) : (
                      <>
                        Enviar link <ArrowRight aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
                <p className="mt-6 text-sm text-muted-foreground">
                  Já tem um código?{" "}
                  <Link to="/redefinir-senha" className="font-semibold text-primary underline">
                    Redefinir senha
                  </Link>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Lembrou a senha?{" "}
                  <Link to="/entrar" className="font-semibold text-primary underline">
                    Entrar
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
    </AutenticacaoLayout>
  );
}
