import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import autenticacaoService from "@/services/autenticacao.service";
import { extrairMensagemErro } from "@/services/api";

// Mesmas regras de `configuracoes/senha.tsx`: as duas telas seguem a regra do backend
// (`regrasSenha` em `autenticacaoValidator.js`).
const regrasSenha = z
  .string()
  .min(8, "A senha deve ter entre 8 e 72 caracteres.")
  .max(72, "A senha deve ter entre 8 e 72 caracteres.")
  .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula.")
  .regex(/[a-z]/, "A senha deve conter ao menos uma letra minúscula.")
  .regex(/\d/, "A senha deve conter ao menos um número.")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter ao menos um caractere especial.");

/** Mecanismo principal: só a nova senha; o token (do link do e-mail) já identifica a solicitação sozinho. */
const esquemaToken = z
  .object({
    novaSenha: regrasSenha,
    confirmarSenha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

/** Fallback: código de 6 dígitos, único mecanismo usado pelo aplicativo mobile (sem deep link). */
const esquemaCodigo = z
  .object({
    email: z.string().trim().min(1, "Informe seu e-mail.").email("Informe um e-mail válido."),
    codigo: z
      .string()
      .trim()
      .length(6, "O código deve ter 6 dígitos.")
      .regex(/^\d{6}$/, "O código deve conter apenas números."),
    novaSenha: regrasSenha,
    confirmarSenha: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

type FormularioToken = z.infer<typeof esquemaToken>;
type FormularioCodigo = z.infer<typeof esquemaCodigo>;

export const Route = createFileRoute("/redefinir-senha")({
  // `z.coerce.string()`, e não `z.string()`: o parser de search params do TanStack Router converte
  // um valor só com dígitos em `number` antes da validação, e um código de 6 dígitos sempre tem
  // essa aparência (ver `confirmar-email.tsx`).
  validateSearch: z.object({
    token: z.coerce.string().optional(),
    email: z.string().optional(),
    codigo: z.coerce.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Redefinir senha — ACESSO" },
      { name: "description", content: "Defina uma nova senha para sua conta ACESSO." },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const { token, email, codigo } = Route.useSearch();

  // O link do e-mail manda só `?token=`, e a tela pede apenas a nova senha. Sem token, vale o
  // código de 6 dígitos, para quem prefere digitar o código ou chegou por "Já tenho um código" em
  // `/recuperar-senha`.
  return token ? <FormularioComToken token={token} /> : <FormularioComCodigo emailInicial={email} codigoInicial={codigo} />;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AutenticacaoLayout>
      <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
        <Logo />
      </Link>
      <Card className="shadow-card">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}

function FormularioComToken({ token }: { token: string }) {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioToken>({
    resolver: zodResolver(esquemaToken),
    defaultValues: { novaSenha: "", confirmarSenha: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await autenticacaoService.redefinirSenha({ token, novaSenha: valores.novaSenha });
      toast.success("Senha redefinida com sucesso! Faça login novamente.");
      navigate({ to: "/entrar" });
    } catch (erro) {
      // Qualquer rejeição do servidor aqui é "link inválido ou expirado"
      // (é a única forma de o backend recusar este fluxo): substitui o
      // formulário por um estado próprio em vez de anexar o erro a um
      // campo, já que não há mais campo de código/e-mail para apontar.
      setLinkInvalido(true);
      toast.error(extrairMensagemErro(erro, "Link inválido ou expirado."));
    } finally {
      setEnviando(false);
    }
  });

  if (linkInvalido) {
    return (
      <Layout>
        <div role="alert" className="space-y-4 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de redefinição já foi usado, expirou ou é inválido. Solicite um novo link para continuar.
          </p>
          <Button asChild className="min-h-12 w-full text-base">
            <Link to="/recuperar-senha">Solicitar novo link</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold">Redefinir senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      <form className="mt-6 space-y-4" onSubmit={aoEnviar} noValidate>
        <div className="space-y-2">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <PasswordInput
            id="nova-senha"
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
          <PasswordInput
            id="confirmar-senha"
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
    </Layout>
  );
}

function FormularioComCodigo({ emailInicial, codigoInicial }: { emailInicial?: string; codigoInicial?: string }) {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<FormularioCodigo>({
    resolver: zodResolver(esquemaCodigo),
    defaultValues: {
      email: emailInicial ?? "",
      codigo: codigoInicial ?? "",
      novaSenha: "",
      confirmarSenha: "",
    },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await autenticacaoService.redefinirSenha({
        email: valores.email,
        codigo: valores.codigo,
        novaSenha: valores.novaSenha,
      });
      toast.success("Senha redefinida com sucesso! Faça login novamente.");
      navigate({ to: "/entrar" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível redefinir a senha.");
      // Anexa a mensagem ao campo do código (causa mais comum de rejeição:
      // código incorreto/expirado/já usado) e move o foco pra lá, pra
      // quem usa teclado ou o leitor de voz não precisar procurar onde
      // corrigir; o toast (lido automaticamente por `useLeituraAutomatica`)
      // continua cobrindo qualquer outra causa (ex.: limite de tentativas).
      setError("codigo", { message: mensagem });
      setFocus("codigo");
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  });

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold">Redefinir senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Prefere usar o link enviado por e-mail? Ele é mais rápido — basta clicar em "Redefinir minha senha" na
        mensagem que enviamos. Se estiver no aplicativo ACESSO, informe o código de 6 dígitos abaixo.
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
          <PasswordInput
            id="nova-senha"
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
          <PasswordInput
            id="confirmar-senha"
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
    </Layout>
  );
}
