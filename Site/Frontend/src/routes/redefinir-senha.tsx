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
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";
import type { TFuncao } from "@/contexts/IdiomaContext";
import { criarRegrasDeSenha } from "@/lib/regrasDeSenha";

/** Mecanismo principal: só a nova senha; o token (do link do e-mail) já identifica a solicitação sozinho. */
const criarEsquemaToken = (t: TFuncao) =>
  z
    .object({
      novaSenha: criarRegrasDeSenha(t),
      confirmarSenha: z.string().min(1, t("validacao.confirmeNovaSenha")),
    })
    .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
      message: t("validacao.senhasNaoCoincidem"),
      path: ["confirmarSenha"],
    });

/** Fallback: código de 6 dígitos, único mecanismo usado pelo aplicativo mobile (sem deep link). */
const criarEsquemaCodigo = (t: TFuncao) =>
  z
    .object({
      email: z.string().trim().min(1, t("validacao.informeSeuEmail")).email(t("validacao.emailValido")),
      codigo: z
        .string()
        .trim()
        .length(6, t("validacao.codigoSeisDigitos"))
        .regex(/^\d{6}$/, t("validacao.codigoApenasNumeros")),
      novaSenha: criarRegrasDeSenha(t),
      confirmarSenha: z.string().min(1, t("validacao.confirmeNovaSenha")),
    })
    .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
      message: t("validacao.senhasNaoCoincidem"),
      path: ["confirmarSenha"],
    });

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
  head: () => ({
    meta: [
      { title: textoDaPagina("redefinir-senha.redefinirSenhaAcesso") },
      { name: "description", content: textoDaPagina("redefinir-senha.definaUmaNovaSenhaParaSuaConta") },
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
  const { t } = useIdioma();
  return (
    <AutenticacaoLayout>
      <Link to="/" aria-label={t("redefinir-senha.voltarParaAPaginaInicial")} className="mb-6 inline-flex">
        <Logo />
      </Link>
      <Card className="shadow-card">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}

function FormularioComToken({ token }: { token: string }) {
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioToken>({
    resolver: zodResolver(useMemo(() => criarEsquemaToken(t), [t])),
    defaultValues: { novaSenha: "", confirmarSenha: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await autenticacaoService.redefinirSenha({ token, novaSenha: valores.novaSenha });
      toast.success(t("redefinir-senha.senhaRedefinidaComSucessoFaca"));
      navigate({ to: "/entrar" });
    } catch (erro) {
      // Qualquer rejeição do servidor aqui é "link inválido ou expirado"
      // (é a única forma de o backend recusar este fluxo): substitui o
      // formulário por um estado próprio em vez de anexar o erro a um
      // campo, já que não há mais campo de código/e-mail para apontar.
      setLinkInvalido(true);
      toast.error(extrairMensagemErro(erro, t("redefinir-senha.linkInvalidoOuExpirado2")));
    } finally {
      setEnviando(false);
    }
  });

  if (linkInvalido) {
    return (
      <Layout>
        <div role="alert" className="space-y-4 text-center">
          <AlertTriangle className="mx-auto size-10 text-destructive" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold">{t("redefinir-senha.linkInvalidoOuExpirado")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("redefinir-senha.esteLinkDeRedefinicaoJaFoi")}
          </p>
          <Button asChild className="min-h-12 w-full text-base">
            <Link to="/recuperar-senha">{t("redefinir-senha.solicitarNovoLink")}</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-extrabold">{t("redefinir-senha.redefinirSenha")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("redefinir-senha.escolhaUmaNovaSenhaParaSua")}</p>
      <form className="mt-6 space-y-4" onSubmit={aoEnviar} noValidate>
        <div className="space-y-2">
          <Label htmlFor="nova-senha">{t("redefinir-senha.novaSenha")}</Label>
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
              {t("redefinir-senha.useAoMenos8CaracteresCom")}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">{t("redefinir-senha.confirmarNovaSenha")}</Label>
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
              <Loader2 className="animate-spin" aria-hidden="true" /> {t("configuracoes.senha.salvando")}
            </>
          ) : (
            <>
              <Check aria-hidden="true" /> {t("recuperar-senha.redefinirSenha")}
            </>
          )}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {t("auth.lembrouASenha")}{" "}
        <Link to="/entrar" className="font-semibold text-primary underline">
          {t("cabecalho.entrar")}
        </Link>
      </p>
    </Layout>
  );
}

function FormularioComCodigo({ emailInicial, codigoInicial }: { emailInicial?: string; codigoInicial?: string }) {
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<FormularioCodigo>({
    resolver: zodResolver(useMemo(() => criarEsquemaCodigo(t), [t])),
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
      toast.success(t("redefinir-senha.senhaRedefinidaComSucessoFaca"));
      navigate({ to: "/entrar" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, t("redefinir-senha.naoFoiPossivelRedefinirASenha"));
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
      <h1 className="text-2xl font-extrabold">{t("redefinir-senha.redefinirSenha")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("redefinir-senha.prefereUsarOLink", { botao: t("redefinir-senha.redefinirMinhaSenha") })}
      </p>
      <form className="mt-6 space-y-4" onSubmit={aoEnviar} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t("login.email")}</Label>
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
          <Label htmlFor="codigo">{t("redefinir-senha.codigoDeVerificacao")}</Label>
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
          <Label htmlFor="nova-senha">{t("redefinir-senha.novaSenha")}</Label>
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
              {t("redefinir-senha.useAoMenos8CaracteresCom")}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">{t("redefinir-senha.confirmarNovaSenha")}</Label>
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
              <Loader2 className="animate-spin" aria-hidden="true" /> {t("configuracoes.senha.salvando")}
            </>
          ) : (
            <>
              <Check aria-hidden="true" /> {t("recuperar-senha.redefinirSenha")}
            </>
          )}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        {t("auth.lembrouASenha")}{" "}
        <Link to="/entrar" className="font-semibold text-primary underline">
          {t("cabecalho.entrar")}
        </Link>
      </p>
    </Layout>
  );
}
