import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService from "@/services/auth.service";
import { extrairMensagemErro } from "@/services/api";

const esquema = z
  .object({
    email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
    codigo: z
      .string()
      .trim()
      .length(6, "O código deve ter 6 dígitos.")
      .regex(/^\d{6}$/, "O código deve conter apenas números."),
    // Mesmas regras de `configuracoes/senha.tsx` (troca autenticada) —
    // antes esta tela aceitava uma senha mais fraca (sem caractere
    // especial) do que o resto do app exige, uma divergência silenciosa
    // entre os dois validators do backend, corrigida junto (ambos agora
    // reaproveitam a mesma regra em `authValidator.regrasSenha`).
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

export const Route = createFileRoute("/redefinir-senha")({
  validateSearch: z.object({ email: z.string().optional(), codigo: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Redefinir senha — ACESSO" },
      { name: "description", content: "Informe o código recebido por e-mail e defina uma nova senha." },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const { email, codigo } = Route.useSearch();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { email: email ?? "", codigo: codigo ?? "", novaSenha: "", confirmarSenha: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await authService.redefinirSenha({
        email: valores.email,
        codigo: valores.codigo,
        novaSenha: valores.novaSenha,
      });
      toast.success("Senha redefinida com sucesso! Faça login novamente.");
      navigate({ to: "/entrar" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível redefinir a senha.");
      // Anexa a mensagem ao campo do código (causa mais comum de rejeição
      // — código incorreto/expirado/já usado) e move o foco pra lá, pra
      // quem usa teclado ou o leitor de voz não precisar procurar onde
      // corrigir; o toast (lido automaticamente por `useAutoSpeech`)
      // continua cobrindo qualquer outra causa (ex.: limite de tentativas).
      setError("codigo", { message: mensagem });
      setFocus("codigo");
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
            <h1 className="text-2xl font-extrabold">Redefinir senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Informe o código de 6 dígitos enviado ao seu e-mail e escolha uma nova senha.
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
                <Label htmlFor="codigo">Código de verificação</Label>
                <Input
                  id="codigo"
                  inputMode="numeric"
                  maxLength={6}
                  className="min-h-12"
                  aria-invalid={Boolean(errors.codigo)}
                  aria-describedby={errors.codigo ? "codigo-erro" : undefined}
                  {...register("codigo")}
                />
                {errors.codigo && (
                  <p id="codigo-erro" role="alert" className="text-sm font-medium text-destructive">
                    {errors.codigo.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input
                  id="nova-senha"
                  type="password"
                  autoComplete="new-password"
                  className="min-h-12"
                  aria-describedby={errors.novaSenha ? "nova-senha-erro" : "nova-senha-dica"}
                  aria-invalid={Boolean(errors.novaSenha)}
                  {...register("novaSenha")}
                />
                {errors.novaSenha ? (
                  <p id="nova-senha-erro" role="alert" className="text-sm font-medium text-destructive">
                    {errors.novaSenha.message}
                  </p>
                ) : (
                  <p id="nova-senha-dica" className="text-sm text-muted-foreground">
                    Use ao menos 8 caracteres, com maiúscula, minúscula, número e caractere especial.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                <Input
                  id="confirmar-senha"
                  type="password"
                  autoComplete="new-password"
                  className="min-h-12"
                  aria-invalid={Boolean(errors.confirmarSenha)}
                  aria-describedby={errors.confirmarSenha ? "confirmar-senha-erro" : undefined}
                  {...register("confirmarSenha")}
                />
                {errors.confirmarSenha && (
                  <p id="confirmar-senha-erro" role="alert" className="text-sm font-medium text-destructive">
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
                  <>
                    <Check aria-hidden="true" /> Redefinir senha
                  </>
                )}
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted-foreground">
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
