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
import { useSession } from "@/contexts/SessionContext";
import { extrairMensagemErro } from "@/services/api";

const esquemaLogin = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha."),
});

type FormularioLogin = z.infer<typeof esquemaLogin>;

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — ACESSO" },
      { name: "description", content: "Acesse sua conta ACESSO e continue sua jornada profissional inclusiva." },
      { property: "og:title", content: "Entrar — ACESSO" },
      { property: "og:description", content: "Acesse sua conta na rede profissional acessível." },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormularioLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: "", senha: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await login(valores);
      toast.success("Login realizado com sucesso!");
      navigate({ to: "/feed" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível entrar. Verifique seus dados.");
      setError("senha", { message: mensagem });
      toast.error(mensagem);
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
            <h1 className="text-2xl font-extrabold">Entrar no ACESSO</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Suas preferências de acessibilidade acompanham sua conta.
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                  <Link to="/recuperar-senha" className="text-sm font-semibold text-primary underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  className="min-h-12"
                  aria-invalid={Boolean(errors.senha)}
                  aria-describedby={errors.senha ? "senha-erro" : undefined}
                  {...register("senha")}
                />
                {errors.senha && (
                  <p id="senha-erro" role="alert" className="text-sm font-medium text-destructive">
                    {errors.senha.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
                {enviando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> Entrando…
                  </>
                ) : (
                  <>
                    Entrar <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link to="/cadastro" className="font-semibold text-primary underline">
                Criar conta gratuita
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
