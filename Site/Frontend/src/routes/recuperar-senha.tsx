import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService from "@/services/auth.service";
import { extrairMensagemErro } from "@/services/api";

const esquema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
});

type Formulario = z.infer<typeof esquema>;

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — ACESSO" },
      { name: "description", content: "Solicite um código para redefinir sua senha do ACESSO." },
    ],
  }),
  component: RecuperarSenha,
});

function RecuperarSenha() {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { email: "" } });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await authService.esqueciSenha(valores.email);
      toast.success("Se o e-mail existir, enviamos um código de recuperação.");
      navigate({ to: "/redefinir-senha", search: { email: getValues("email") } });
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível solicitar a recuperação de senha."));
    } finally {
      setEnviando(false);
    }
  });

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h1 className="text-2xl font-extrabold">Recuperar senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe seu e-mail para receber um código de verificação de 6 dígitos.
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
                    Enviar código <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted-foreground">
              Já tem o código?{" "}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
