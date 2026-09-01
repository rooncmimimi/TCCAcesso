import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { extrairMensagemErro } from "@/services/api";
import { useSpeech } from "@/contexts/SpeechContext";
import { useSession } from "@/contexts/SessionContext";

const esquema = z
  .object({
    senhaAtual: z.string().min(1, "Informe sua senha atual."),
    novaSenha: z
      .string()
      .min(8, "A senha deve ter entre 8 e 72 caracteres.")
      .max(72, "A senha deve ter entre 8 e 72 caracteres.")
      .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula.")
      .regex(/[a-z]/, "A senha deve conter ao menos uma letra minúscula.")
      .regex(/\d/, "A senha deve conter ao menos um número.")
      .regex(/[^A-Za-z0-9]/, "A senha deve conter ao menos um caractere especial."),
    confirmarSenha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

type Formulario = z.infer<typeof esquema>;

export const Route = createFileRoute("/configuracoes/senha")({
  head: () => ({
    meta: [
      { title: "Alterar senha — ACESSO" },
      { name: "description", content: "Altere a senha da sua conta ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <AlterarSenha />
    </GuardaAcesso>
  ),
});

function AlterarSenha() {
  const navigate = useNavigate();
  const { speak, choice } = useSpeech();
  const { signOut } = useSession();
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { senhaAtual: "", novaSenha: "", confirmarSenha: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await authService.alterarSenha(valores.senhaAtual, valores.novaSenha);
      reset();
      // O backend encerra TODAS as sessões (inclusive esta) ao trocar a senha —
      // mesmo padrão já usado na redefinição de senha por código.
      await signOut();
      toast.success("Senha alterada com sucesso. Entre novamente com a nova senha.");
      if (choice === "accepted") {
        speak("Senha alterada com sucesso. Entre novamente com a nova senha.");
      }
      void navigate({ to: "/entrar" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível alterar a senha.");
      setError("senhaAtual", { message: mensagem });
      toast.error(mensagem);
      if (choice === "accepted") {
        speak(mensagem);
      }
    } finally {
      setEnviando(false);
    }
  });

  return (
    <AppShell>
      <Link
        to="/configuracoes/conta"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Alterar senha</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Depois de trocar a senha, você continua conectado aqui, mas os outros dispositivos precisam entrar
            novamente.
          </p>
        </div>
      </div>

      <Card className="mt-6 max-w-lg shadow-none">
        <CardContent className="p-5 sm:p-6">
          <form className="space-y-4" onSubmit={aoEnviar} noValidate>
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">Senha atual</Label>
              <Input
                id="senhaAtual"
                type="password"
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
              <Label htmlFor="novaSenha">Nova senha</Label>
              <Input
                id="novaSenha"
                type="password"
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
                  Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
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
                  <Loader2 className="animate-spin" aria-hidden="true" /> Salvando…
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
