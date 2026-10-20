import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
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
import { metaPagina, regraCodigo6, regraEmail, SeletorIdioma, dic, useT, type Dicionario } from "@/i18n";

function criarEsquema(v: Dicionario["validacao"]) {
  return z.object({
    email: regraEmail(v),
    // 6 dígitos, o mesmo tamanho gerado por `gerarCodigoNumerico(6)` no backend
    // (`AutenticacaoService.enviarCodigoConfirmacaoCadastro`).
    codigo: regraCodigo6(v),
  });
}

type Formulario = z.infer<ReturnType<typeof criarEsquema>>;

export const Route = createFileRoute("/confirmar-email")({
  // `z.coerce.string()`, e não `z.string()`: o parser de search params do TanStack Router converte
  // um valor só com dígitos (como `?codigo=123456`) em `number` antes da validação, e `z.string()`
  // recusaria todo link de confirmação. `.optional()` continua valendo quando o parâmetro não
  // existe.
  validateSearch: z.object({
    email: z.string().optional(),
    codigo: z.coerce.string().optional(),
  }),
  head: () => metaPagina(dic().auth.confirmar.meta),
  component: ConfirmarEmail,
});

type Estado = "confirmando-link" | "formulario" | "sucesso";

/**
 * Duas formas de confirmar o e-mail, as mesmas oferecidas no próprio e-mail
 * (`modeloConfirmacaoCadastro`): clicar no botão, que chega com `email` e `codigo` na URL e
 * confirma sozinho ao montar, ou digitar o código de 6 dígitos neste formulário.
 */
function ConfirmarEmail() {
  const t = useT();
  const tc = t.auth.confirmar;
  const esquema = useMemo(() => criarEsquema(t.validacao), [t]);
  const { email, codigo } = Route.useSearch();
  const [estado, setEstado] = useState<Estado>(email && codigo ? "confirmando-link" : "formulario");
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const tentouAutoConfirmar = useRef(false);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { email: email ?? "", codigo: codigo ?? "" },
  });

  const confirmar = handleSubmit(async (valores) => {
    setConfirmando(true);
    try {
      await autenticacaoService.confirmarCadastro(valores.email, valores.codigo);
      setEstado("sucesso");
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, tc.erro);
      setEstado("formulario");
      setError("codigo", { message: mensagem });
      setFocus("codigo");
      toast.error(mensagem);
    } finally {
      setConfirmando(false);
    }
  });

  // Link do e-mail: confirma sozinho, uma única vez, quando os dois parâmetros chegam na URL.
  useEffect(() => {
    if (!email || !codigo || tentouAutoConfirmar.current) return;
    tentouAutoConfirmar.current = true;
    void confirmar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, codigo]);

  useEffect(() => {
    tituloRef.current?.focus();
  }, [estado]);

  async function reenviar() {
    const emailAtual = getValues("email");
    if (!emailAtual) return;
    setReenviando(true);
    try {
      await autenticacaoService.reenviarConfirmacaoCadastro(emailAtual);
      setReenviado(true);
      toast.success(tc.reenviadoAviso);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, tc.erroReenviar));
    } finally {
      setReenviando(false);
    }
  }

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
            {estado === "confirmando-link" ? (
              <div className="text-center">
                <div className="grid place-items-center">
                  <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
                </div>
                <h1
                  ref={tituloRef}
                  tabIndex={-1}
                  role="status"
                  aria-live="polite"
                  className="mt-4 text-xl font-extrabold outline-none"
                >
                  {tc.confirmando}
                </h1>
              </div>
            ) : estado === "sucesso" ? (
              <div className="text-center">
                <div className="grid place-items-center">
                  <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
                </div>
                <h1 ref={tituloRef} tabIndex={-1} className="mt-4 text-xl font-extrabold outline-none">
                  {tc.sucesso}
                </h1>
                {/*
                  Sem prometer que acabou: quem confirma vindo do cadastro ainda tem as duas
                  últimas etapas pela frente, e o login leva direto para elas (`?retomar=true`).
                */}
                <p className="mt-2 text-sm text-muted-foreground">
                  {tc.sucessoTexto}
                </p>
                <Button asChild className="mt-6 min-h-12 w-full text-base">
                  <Link to="/entrar">{tc.entrarNoAcesso}</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"
                  >
                    <Mail className="size-5" />
                  </span>
                  <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
                    {tc.titulo}
                  </h1>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {tc.texto}
                </p>

                <form className="mt-6 space-y-4" onSubmit={confirmar} noValidate>
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
                    <Label htmlFor="codigo">{tc.codigo}</Label>
                    <Input
                      id="codigo"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
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
                  <Button type="submit" className="min-h-12 w-full text-base" disabled={confirmando}>
                    {confirmando ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden="true" /> {tc.confirmandoBotao}
                      </>
                    ) : (
                      tc.confirmarBotao
                    )}
                  </Button>
                </form>

                <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <p>
                    {tc.naoRecebeu}{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary underline disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={reenviando || reenviado}
                      onClick={() => void reenviar()}
                    >
                      {reenviando ? tc.reenviando : reenviado ? tc.reenviado : tc.reenviar}
                    </button>
                  </p>
                  <p>
                    {tc.jaConfirmou}{" "}
                    <Link to="/entrar" className="font-semibold text-primary underline">
                      {t.comum.entrar}
                    </Link>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
    </AutenticacaoLayout>
  );
}
