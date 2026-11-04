import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { destinoAposEntrar } from "@/lib/destinoAposEntrar";
import { guardarVerificacao } from "@/lib/verificacaoDispositivo";
import { useEstadoDaSeguranca } from "@/hooks/useEstadoDaSeguranca";
import { useIdioma } from "@/hooks/useIdioma";
import { SeletorDeIdioma } from "@/components/SeletorDeIdioma";

type TFuncao = ReturnType<typeof useIdioma>["t"];

/** O esquema nasce do idioma atual: as mensagens de erro saem na língua da tela. */
const criarEsquemaLogin = (t: TFuncao) =>
  z.object({
    email: z.string().trim().min(1, t("login.erroEmail")).email(t("login.erroEmailFormato")),
    senha: z.string().min(1, t("login.erroSenha")),
  });

type FormularioLogin = z.infer<ReturnType<typeof criarEsquemaLogin>>;

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
  const { t } = useIdioma();
  const esquemaLogin = useMemo(() => criarEsquemaLogin(t), [t]);
  // Só oferece "Acho que invadiram minha conta" quando o recurso está ligado no servidor.
  const { data: estadoSeguranca } = useEstadoDaSeguranca();
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
      // Dispositivo que o servidor não reconhece: o código de 6 números foi para o e-mail. Nenhuma sessão foi aberta.
      if ("verificacaoDispositivo" in resultado) {
        guardarVerificacao({
          desafio: resultado.desafioDispositivo,
          emailMascarado: resultado.emailMascarado,
          reenvioEmSegundos: resultado.reenvioEmSegundos,
        });
        navigate({ to: "/verificacao-de-dispositivo" });
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
      toast.success(t("login.sucesso"));

      // Retomar o cadastro por terminar, painel do administrador ou feed: a regra é a mesma do
      // retorno do Google (ver `lib/destinoAposEntrar.ts`).
      navigate(destinoAposEntrar(resultado));
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, t("login.falha"));
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
      toast.success(t("login.novoEmailEnviado"));
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t("login.reenvioFalhou")));
    } finally {
      setReenviando(false);
    }
  }

  async function reativarConta() {
    if (!contaPausadaPendente) return;
    setEnviando(true);
    try {
      const resultado = await entrar({ ...contaPausadaPendente, confirmarReativacao: true });
      if ("verificacaoDispositivo" in resultado) {
        guardarVerificacao({
          desafio: resultado.desafioDispositivo,
          emailMascarado: resultado.emailMascarado,
          reenvioEmSegundos: resultado.reenvioEmSegundos,
        });
        navigate({ to: "/verificacao-de-dispositivo" });
        return;
      }
      if ("contaPausada" in resultado || "emailNaoVerificado" in resultado) return;
      // Os toasts abaixo já são lidos pelo `useLeituraAutomatica`; falar aqui também duplicaria a
      // leitura.
      toast.success(t("login.reativada"));
      navigate(destinoAposEntrar(resultado));
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, t("login.reativarFalhou"));
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  const emInterrupcao = Boolean(emailNaoVerificado || contaPausadaPendente);

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <Link to="/" aria-label={t("auth.voltarPaginaInicial")} className="inline-flex">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2">
          <SeletorDeIdioma />
          <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label={t("auth.configAcessibilidade")}>
            <Link to="/configuracoes/acessibilidade">
              <Accessibility aria-hidden="true" />
              <span className="hidden sm:inline">{t("auth.acessibilidade")}</span>
            </Link>
          </Button>
        </div>
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
                  data-speak={t("login.confirmeEmailVoz")}
                  className="text-xl font-extrabold outline-none"
                >
                  {t("login.confirmeEmail")}
                </h1>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {t("login.enviamosEmail")}{" "}
                <strong className="text-foreground">{emailNaoVerificado}</strong>. {t("login.enviamosEmailDica")}
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
                    <Loader2 className="animate-spin" aria-hidden="true" /> {t("login.reenviando")}
                  </>
                ) : reenviado ? (
                  t("login.emailReenviado")
                ) : (
                  t("login.reenviarEmail")
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
                <ArrowLeft className="size-4" aria-hidden="true" /> {t("auth.voltar")}
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
                  data-speak={t("login.contaPausadaVoz")}
                  className="text-xl font-extrabold outline-none"
                >
                  {t("login.contaPausada")}
                </h1>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {t("login.contaPausadaTexto")}
              </p>

              <Button type="button" className="mt-6 min-h-12 w-full text-base" disabled={enviando} onClick={reativarConta}>
                {enviando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> {t("login.reativando")}
                  </>
                ) : (
                  t("login.reativar")
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="mt-2 min-h-11 w-full gap-2"
                onClick={() => setContaPausadaPendente(null)}
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> {t("auth.voltar")}
              </Button>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold">{t("login.titulo")}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("login.subtitulo")}
                </p>
              </div>

              <BotaoGoogle />

              <form className="space-y-5" onSubmit={aoEnviar} noValidate>
                <Campo id="email" rotulo={t("login.email")} erro={errors.email?.message}>
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
                  rotulo={t("login.senha")}
                  erro={errors.senha?.message}
                  acao={
                    <Link to="/recuperar-senha" className="text-sm font-semibold text-primary underline">
                      {t("login.esqueceuSenha")}
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

                {estadoSeguranca?.habilitado && (
                  <p className="text-sm">
                    <Link to="/conta-comprometida" className="font-semibold text-primary underline">
                      {t("login.contaComprometida")}
                    </Link>
                  </p>
                )}

                <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
                  {enviando ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> {t("login.entrando")}
                    </>
                  ) : (
                    <>
                      {t("login.entrar")} <ArrowRight aria-hidden="true" />
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
          {t("login.semConta")}{" "}
          <Link to="/cadastro" className="font-semibold text-primary underline underline-offset-2">
            {t("login.criarConta")}
          </Link>
        </p>
      )}
    </AutenticacaoLayout>
  );
}
