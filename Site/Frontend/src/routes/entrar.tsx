import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, ArrowRight, Loader2, Mail, PauseCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useSession } from "@/contexts/SessionContext";
import { useSpeech } from "@/contexts/SpeechContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import authService from "@/services/auth.service";
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
  const { speak } = useSpeech();
  // Fase 9, Bloco 7: `prefs.screenReader` é a única fonte de verdade sobre
  // a leitura por voz — nunca `choice`.
  const { prefs } = useAccessibility();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [credenciaisPendentes, setCredenciaisPendentes] = useState<{ email: string; senha: string } | null>(null);
  const [contaPausadaPendente, setContaPausadaPendente] = useState<{ email: string; senha: string } | null>(null);
  const [emailNaoVerificado, setEmailNaoVerificado] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const tituloCodigoRef = useRef<HTMLHeadingElement>(null);
  const tituloPausadaRef = useRef<HTMLHeadingElement>(null);
  const tituloNaoVerificadoRef = useRef<HTMLHeadingElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormularioLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: "", senha: "" },
  });

  useEffect(() => {
    if (credenciaisPendentes) {
      tituloCodigoRef.current?.focus();
    }
  }, [credenciaisPendentes]);

  useEffect(() => {
    if (contaPausadaPendente) {
      tituloPausadaRef.current?.focus();
    }
  }, [contaPausadaPendente]);

  useEffect(() => {
    if (emailNaoVerificado) {
      tituloNaoVerificadoRef.current?.focus();
    }
  }, [emailNaoVerificado]);

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      const resultado = await login(valores);
      if ("requerDoisFatores" in resultado) {
        setCredenciaisPendentes(valores);
        return;
      }
      if ("contaPausada" in resultado) {
        setContaPausadaPendente(valores);
        return;
      }
      if ("emailNaoVerificado" in resultado) {
        setEmailNaoVerificado(resultado.email);
        return;
      }
      toast.success("Login realizado com sucesso!");
      navigate({ to: "/feed" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível entrar. Verifique seus dados.");
      setError("senha", { message: mensagem });
      // Fase 9, Bloco 7: o toast já é lido automaticamente por
      // `useAutoSpeech` (MutationObserver) — falar aqui também duplicava.
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  });

  async function reenviarConfirmacao() {
    if (!emailNaoVerificado) return;
    setReenviando(true);
    try {
      await authService.reenviarConfirmacaoCadastro(emailNaoVerificado);
      setReenviado(true);
      toast.success("Um novo e-mail de confirmação foi enviado.");
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível reenviar o e-mail agora."));
    } finally {
      setReenviando(false);
    }
  }

  async function reativarConta() {
    if (!contaPausadaPendente) return;
    setEnviando(true);
    try {
      const resultado = await login({ ...contaPausadaPendente, confirmarReativacao: true });
      if ("requerDoisFatores" in resultado) {
        setContaPausadaPendente(null);
        setCredenciaisPendentes(contaPausadaPendente);
        return;
      }
      if ("contaPausada" in resultado) return;
      // Fase 9, Bloco 7: os toasts abaixo já são lidos automaticamente por
      // `useAutoSpeech` — falar aqui também duplicava.
      toast.success("Conta reativada. Bem-vindo de volta!");
      navigate({ to: "/feed" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível reativar a conta.");
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarCodigo() {
    if (!credenciaisPendentes || codigo.length !== 6) return;
    setEnviando(true);
    setErroCodigo(null);
    try {
      const resultado = await login({ ...credenciaisPendentes, codigoTotp: codigo });
      if ("requerDoisFatores" in resultado) {
        // Não deveria acontecer (o código já foi enviado), mas evita travar a UI.
        setErroCodigo("Não foi possível confirmar o código. Tente novamente.");
        return;
      }
      toast.success("Login realizado com sucesso!");
      navigate({ to: "/feed" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Código de verificação inválido.");
      // Este erro é só um texto inline (`erroCodigo`), nunca um toast —
      // continua legítimo falar aqui, é a única leitura deste evento.
      setErroCodigo(mensagem);
      if (prefs.screenReader) {
        speak(mensagem);
      }
      setCodigo("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6">
            {emailNaoVerificado ? (
              <>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Mail className="size-5" />
                  </span>
                  <div>
                    <h1
                      ref={tituloNaoVerificadoRef}
                      tabIndex={-1}
                      data-speak="Confirme seu e-mail antes de entrar."
                      className="text-xl font-extrabold outline-none"
                    >
                      Confirme seu e-mail
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Enviamos um e-mail de confirmação para <strong className="text-foreground">{emailNaoVerificado}</strong>. Verifique
                      sua caixa de entrada (e a pasta de spam) e clique no link antes de entrar.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 min-h-11 w-full"
                  disabled={reenviando || reenviado}
                  onClick={reenviarConfirmacao}
                >
                  {reenviando ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> Reenviando…
                    </>
                  ) : reenviado ? (
                    "E-mail reenviado"
                  ) : (
                    "Reenviar e-mail"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 min-h-11 w-full gap-2"
                  onClick={() => {
                    setEmailNaoVerificado(null);
                    setReenviado(false);
                  }}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
                </Button>
              </>
            ) : contaPausadaPendente ? (
              <>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <PauseCircle className="size-5" />
                  </span>
                  <div>
                    <h1
                      ref={tituloPausadaRef}
                      tabIndex={-1}
                      data-speak="Sua conta está pausada. Deseja reativá-la agora?"
                      className="text-xl font-extrabold outline-none"
                    >
                      Sua conta está pausada
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Você pausou esta conta anteriormente. Deseja reativá-la e continuar?
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="mt-6 min-h-12 w-full text-base"
                  disabled={enviando}
                  onClick={reativarConta}
                >
                  {enviando ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> Reativando…
                    </>
                  ) : (
                    "Reativar minha conta"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 min-h-11 w-full gap-2"
                  onClick={() => setContaPausadaPendente(null)}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
                </Button>
              </>
            ) : credenciaisPendentes ? (
              <>
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div>
                    <h1
                      ref={tituloCodigoRef}
                      tabIndex={-1}
                      data-speak="Verificação em duas etapas. Digite o código de 6 dígitos do seu aplicativo autenticador."
                      className="text-xl font-extrabold outline-none"
                    >
                      Verificação em duas etapas
                    </h1>
                    <p className="text-sm text-muted-foreground">Digite o código do seu aplicativo autenticador.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Label htmlFor="codigo-2fa">Código de verificação</Label>
                  <InputOTP
                    id="codigo-2fa"
                    maxLength={6}
                    value={codigo}
                    onChange={(valor) => {
                      setCodigo(valor);
                      setErroCodigo(null);
                    }}
                    aria-describedby={erroCodigo ? "codigo-2fa-erro" : undefined}
                    aria-invalid={Boolean(erroCodigo)}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {erroCodigo && (
                    <p id="codigo-2fa-erro" role="alert" className="text-sm font-medium text-destructive">
                      {erroCodigo}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  className="mt-6 min-h-12 w-full text-base"
                  disabled={enviando || codigo.length !== 6}
                  onClick={confirmarCodigo}
                >
                  {enviando ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> Verificando…
                    </>
                  ) : (
                    "Confirmar código"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 min-h-11 w-full gap-2"
                  onClick={() => {
                    setCredenciaisPendentes(null);
                    setCodigo("");
                    setErroCodigo(null);
                  }}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
