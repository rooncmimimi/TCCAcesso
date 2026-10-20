import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
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
import {
  metaPagina,
  regraCodigo6,
  regraEmail,
  regraSenha,
  SeletorIdioma,
  dic,
  useT,
  type Dicionario,
} from "@/i18n";

// As mesmas regras de `configuracoes/senha.tsx` (ver `regraSenha` em `@/i18n`), que seguem o backend.

/** Mecanismo principal: só a nova senha; o token (do link do e-mail) já identifica a solicitação sozinho. */
function criarEsquemaToken(v: Dicionario["validacao"]) {
  return z
    .object({
      novaSenha: regraSenha(v),
      confirmarSenha: z.string().min(1, v.confirmeNovaSenha),
    })
    .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
      message: v.senhasNaoCoincidem,
      path: ["confirmarSenha"],
    });
}

/** Fallback: código de 6 dígitos, único mecanismo usado pelo aplicativo mobile (sem deep link). */
function criarEsquemaCodigo(v: Dicionario["validacao"]) {
  return z
    .object({
      email: regraEmail(v),
      codigo: regraCodigo6(v),
      novaSenha: regraSenha(v),
      confirmarSenha: z.string().min(1, v.confirmeNovaSenha),
    })
    .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
      message: v.senhasNaoCoincidem,
      path: ["confirmarSenha"],
    });
}

type FormularioToken = z.infer<ReturnType<typeof criarEsquemaToken>>;
type FormularioCodigo = z.infer<ReturnType<typeof criarEsquemaCodigo>>;

export const Route = createFileRoute("/redefinir-senha")({
  // `z.coerce.string()`, e não `z.string()`: o parser de search params do TanStack Router converte
  // um valor só com dígitos em `number` antes da validação, e um código de 6 dígitos sempre tem
  // essa aparência (ver `confirmar-email.tsx`).
  validateSearch: z.object({
    token: z.coerce.string().optional(),
    email: z.string().optional(),
    codigo: z.coerce.string().optional(),
  }),
  head: () => metaPagina(dic().auth.redefinir.meta),
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
  const t = useT();

  return (
    <AutenticacaoLayout>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" aria-label={t.auth.voltarInicioAria} className="inline-flex">
          <Logo />
        </Link>
        <SeletorIdioma compacto id="seletor-idioma-auth" />
      </div>
      <Card className="shadow-card">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}

function FormularioComToken({ token }: { token: string }) {
  const t = useT();
  const tr = t.auth.redefinir;
  const esquemaToken = useMemo(() => criarEsquemaToken(t.validacao), [t]);
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
      toast.success(tr.sucesso);
      navigate({ to: "/entrar" });
    } catch (erro) {
      // Qualquer rejeição do servidor aqui é "link inválido ou expirado"
      // (é a única forma de o backend recusar este fluxo): substitui o
      // formulário por um estado próprio em vez de anexar o erro a um
      // campo, já que não há mais campo de código/e-mail para apontar.
      setLinkInvalido(true);
      toast.error(extrairMensagemErro(erro, tr.linkInvalidoAviso));
    } finally {
      setEnviando(false);
    }
  });

  if (linkInvalido) {
    return (
      <Layout>
        <div role="alert" className="space-y-4 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold">{tr.linkInvalidoTitulo}</h1>
          <p className="text-sm text-muted-foreground">
            {tr.linkInvalidoTexto}
          </p>
          <Button asChild className="min-h-12 w-full text-base">
            <Link to="/recuperar-senha">{tr.solicitarNovo}</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold">{tr.titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{tr.escolha}</p>
      <form className="mt-6 space-y-4" onSubmit={aoEnviar} noValidate>
        <div className="space-y-2">
          <Label htmlFor="nova-senha">{tr.novaSenha}</Label>
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
              {t.validacao.dicaSenha}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">{tr.confirmarSenha}</Label>
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
              <Loader2 className="animate-spin" aria-hidden="true" /> {tr.salvando}
            </>
          ) : (
            <>
              <Check aria-hidden="true" /> {tr.titulo}
            </>
          )}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {tr.lembrou}{" "}
        <Link to="/entrar" className="font-semibold text-primary underline">
          {t.comum.entrar}
        </Link>
      </p>
    </Layout>
  );
}

function FormularioComCodigo({ emailInicial, codigoInicial }: { emailInicial?: string; codigoInicial?: string }) {
  const t = useT();
  const tr = t.auth.redefinir;
  const esquemaCodigo = useMemo(() => criarEsquemaCodigo(t.validacao), [t]);
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
      toast.success(tr.sucesso);
      navigate({ to: "/entrar" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, tr.erro);
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
      <h1 className="text-2xl font-extrabold">{tr.titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{tr.textoCodigo}</p>
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
        <div className="space-y-2">
          <Label htmlFor="codigo">{tr.codigo}</Label>
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
          <Label htmlFor="nova-senha">{tr.novaSenha}</Label>
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
              {t.validacao.dicaSenha}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">{tr.confirmarSenha}</Label>
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
              <Loader2 className="animate-spin" aria-hidden="true" /> {tr.salvando}
            </>
          ) : (
            <>
              <Check aria-hidden="true" /> {tr.titulo}
            </>
          )}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {tr.lembrou}{" "}
        <Link to="/entrar" className="font-semibold text-primary underline">
          {t.comum.entrar}
        </Link>
      </p>
    </Layout>
  );
}
