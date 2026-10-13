import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Accessibility, ArrowLeft, ArrowRight, Loader2, Mail, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { BotaoGoogle } from "@/components/cadastro/BotaoGoogle";
import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { useSessao } from "@/hooks/useSessao";
import autenticacaoService from "@/services/autenticacao.service";
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
  const { entrar } = useSessao();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [contaPausadaPendente, setContaPausadaPendente] = useState<{ email: string; senha: string } | null>(null);
  const [emailNaoVerificado, setEmailNaoVerificado] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const tituloPausadaRef = useRef<HTMLHeadingElement>(null);
  const tituloNaoVerificadoRef = useRef<HTMLHeadingElement>(null);
  // Trava contra envio duplicado. `enviando` só desabilita o botão depois de um novo render, e um
  // clique duplo rápido passaria antes disso, chamando `/auth/login` duas vezes. A ref muda na
  // hora, então o segundo clique é barrado.
  const enviandoRef = useRef(false);

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
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const resultado = await entrar(valores);
      if ("contaPausada" in resultado) {
        setContaPausadaPendente(valores);
        return;
      }
      if ("emailNaoVerificado" in resultado) {
        setEmailNaoVerificado(resultado.email);
        return;
      }
      toast.success("Login realizado com sucesso!");

      // Candidato que não terminou o cadastro volta de onde parou. É o caso normal de quem criou a
      // conta com confirmação de e-mail ativa: as duas últimas etapas exigem sessão e ficaram para
      // depois. `cadastroConcluidoEm` nula é o sinal; contas anteriores a esse campo já nascem
      // preenchidas pela migration, então ninguém antigo é mandado para o cadastro.
      if (resultado.tipo === "candidato" && !resultado.cadastroConcluidoEm) {
        navigate({ to: "/cadastro/candidato", search: { retomar: true } });
        return;
      }

      // Administrador vai direto ao painel administrativo; indo para `/feed` como os demais,
      // parecia que o login não tinha funcionado.
      navigate({ to: resultado.tipo === "administrador" ? "/admin" : "/feed" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível entrar. Verifique seus dados.");
      setError("senha", { message: mensagem });
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.error(mensagem);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  });

  async function reenviarConfirmacao() {
    if (!emailNaoVerificado) return;
    setReenviando(true);
    try {
      await autenticacaoService.reenviarConfirmacaoCadastro(emailNaoVerificado);
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
      const resultado = await entrar({ ...contaPausadaPendente, confirmarReativacao: true });
      if ("contaPausada" in resultado) return;
      // Os toasts abaixo já são lidos pelo `useLeituraAutomatica`; falar aqui também duplicaria a
      // leitura.
      toast.success("Conta reativada. Bem-vindo de volta!");
      navigate({ to: "/feed" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, "Não foi possível reativar a conta.");
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  const emInterrupcao = Boolean(emailNaoVerificado || contaPausadaPendente);

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
          <Logo />
        </Link>
        <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label="Configurações de acessibilidade">
          <Link to="/configuracoes/acessibilidade">
            <Accessibility aria-hidden="true" />
            <span className="hidden sm:inline">Acessibilidade</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {emailNaoVerificado ? (
            <>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"
                >
                  <Mail className="size-5" />
                </span>
                <h1
                  ref={tituloNaoVerificadoRef}
                  tabIndex={-1}
                  data-speak="Confirme seu e-mail antes de entrar."
                  className="text-xl font-extrabold outline-none"
                >
                  Confirme seu e-mail
                </h1>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Enviamos um e-mail de confirmação para{" "}
                <strong className="text-foreground">{emailNaoVerificado}</strong>. Verifique sua caixa de entrada e
                também a pasta de spam, e clique no link antes de entrar.
              </p>

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
                <span
                  aria-hidden="true"
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"
                >
                  <PauseCircle className="size-5" />
                </span>
                <h1
                  ref={tituloPausadaRef}
                  tabIndex={-1}
                  data-speak="Sua conta está pausada. Deseja reativá-la agora?"
                  className="text-xl font-extrabold outline-none"
                >
                  Sua conta está pausada
                </h1>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Você pausou esta conta anteriormente. Deseja reativá-la e continuar?
              </p>

              <Button type="button" className="mt-6 min-h-12 w-full text-base" disabled={enviando} onClick={reativarConta}>
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
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold">Entrar no ACESSO</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Suas preferências de acessibilidade acompanham sua conta.
                </p>
              </div>

              <BotaoGoogle />

              <form className="space-y-5" onSubmit={aoEnviar} noValidate>
                <Campo id="email" rotulo="E-mail" erro={errors.email?.message}>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="min-h-12"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={descricao("email", false, Boolean(errors.email))}
                    {...register("email")}
                  />
                </Campo>

                <Campo
                  id="senha"
                  rotulo="Senha"
                  erro={errors.senha?.message}
                  acao={
                    <Link to="/recuperar-senha" className="text-sm font-semibold text-primary underline">
                      Esqueceu a senha?
                    </Link>
                  }
                >
                  <PasswordInput
                    id="senha"
                    autoComplete="current-password"
                    className="min-h-12"
                    aria-invalid={Boolean(errors.senha)}
                    aria-describedby={descricao("senha", false, Boolean(errors.senha))}
                    {...register("senha")}
                  />
                </Campo>

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
            </>
          )}
        </CardContent>
      </Card>

      {!emInterrupcao && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem uma conta?{" "}
          <Link to="/cadastro" className="font-semibold text-primary underline underline-offset-2">
            Criar conta gratuita
          </Link>
        </p>
      )}
    </AutenticacaoLayout>
  );
}
