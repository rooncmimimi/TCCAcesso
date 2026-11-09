import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Accessibility, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { CampoCodigo } from "@/components/seguranca/CampoCodigo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSessao } from "@/hooks/useSessao";
import { destinoAposEntrar } from "@/lib/destinoAposEntrar";
import { PrazoDoCodigo } from "@/components/acessibilidade/PrazoDoCodigo";
import { lerVerificacao, limparVerificacao, renovarVerificacao, segundosParaReenviar } from "@/lib/verificacaoDispositivo";
import segurancaService, { codigoDoErroSeguranca, desafioDeDispositivoVenceu, mensagemDeErroSeguranca, segundosDeEspera } from "@/services/seguranca.service";
import { useIdioma } from "@/hooks/useIdioma";
import { Frase } from "@/i18n/Frase";
import { textoDaPagina } from "@/i18n/textoDaPagina";

/**
 * Passo 2 do login num aparelho que o servidor ainda não reconhece: o código de 6 números que chegou por e-mail.
 *
 * O desafio que o servidor entregou depois da senha (ou do Google) fica no `sessionStorage` (`lib/verificacaoDispositivo.ts`).
 * Sem ele, ou vencido, a pessoa volta ao login. Um código errado não derruba o desafio: dá para tentar de novo, até 5 vezes; depois
 * é preciso pedir outro código, o que o servidor só deixa de minuto em minuto.
 */
export const Route = createFileRoute("/verificacao-de-dispositivo")({
  head: () => ({
    meta: [
      { title: textoDaPagina("verificacao-de-dispositivo.confirmeEsteDispositivoAcesso") },
      { name: "description", content: textoDaPagina("verificacao-de-dispositivo.digiteOCodigoQueEnviamosPorE") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificacaoDeDispositivo,
});

function VerificacaoDeDispositivo() {
  const { t } = useIdioma();
  const { iniciarSessao } = useSessao();
  const navigate = useNavigate();
  const [verificacao, setVerificacao] = useState(() => lerVerificacao());
  const [codigo, setCodigo] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [contaPausada, setContaPausada] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [podePedirOutro, setPodePedirOutro] = useState(false);
  const enviandoRef = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  // Depois de um erro o foco volta ao campo, mas só quando ele já foi reabilitado (enquanto envia, fica desabilitado).
  const [pedirFoco, setPedirFoco] = useState(0);

  const faltam = verificacao ? segundosParaReenviar(verificacao, agora) : 0;

  useEffect(() => {
    if (pedirFoco > 0) campoRef.current?.focus();
  }, [pedirFoco]);

  useEffect(() => {
    if (!verificacao) {
      void navigate({ to: "/entrar", replace: true });
      return;
    }
    tituloRef.current?.focus();
  }, [verificacao, navigate]);

  // O relógio só corre enquanto há espera; depois que zera, uma única mensagem avisa (lida pelo leitor de tela uma vez).
  useEffect(() => {
    if (!verificacao || faltam <= 0) return undefined;

    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [verificacao, faltam]);

  useEffect(() => {
    if (verificacao && faltam <= 0) setPodePedirOutro(true);
  }, [verificacao, faltam]);

  if (!verificacao) {
    return null;
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current || !verificacao) return;

    if (!/^\d{6}$/.test(codigo.replace(/\s+/g, ""))) {
      setErro(t("verificacao-de-dispositivo.digiteOs6NumerosQueEnviamosPor"));
      campoRef.current?.focus();
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErro(undefined);

    try {
      const resposta = await segurancaService.concluirLogin(verificacao.desafio, codigo.replace(/\s+/g, ""), lembrar);
      limparVerificacao();

      const resultado = await iniciarSessao(resposta);

      // A conta estava pausada: o código já foi gasto; a reativação é no login.
      if ("contaPausada" in resultado) {
        setContaPausada(true);
        return;
      }

      if ("emailNaoVerificado" in resultado || "verificacaoDispositivo" in resultado) {
        void navigate({ to: "/entrar", replace: true });
        return;
      }

      toast.success(lembrar ? "Login realizado. Este dispositivo foi lembrado." : t("login.sucesso"));

      // `replace`: o botão "voltar" não pode reabrir esta tela de passagem.
      void navigate({ ...destinoAposEntrar(resultado), replace: true });
    } catch (falha) {
      if (desafioDeDispositivoVenceu(falha)) {
        limparVerificacao();
        toast.error(mensagemDeErroSeguranca(falha, t("verificacao-de-dispositivo.aVerificacaoExpirouEntre")));
        void navigate({ to: "/entrar", replace: true });
        return;
      }

      const limiteDeTentativas = codigoDoErroSeguranca(falha) === "DISPOSITIVO_TENTATIVAS_DEMAIS";

      setErro(mensagemDeErroSeguranca(falha, t("verificacao-de-dispositivo.naoFoiPossivelVerificarAgora")));
      setCodigo("");
      // Sem tentativas, o botão de pedir outro código é o caminho: o foco vai para ele em vez do campo.
      if (!limiteDeTentativas) setPedirFoco((n) => n + 1);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  async function pedirOutroCodigo() {
    if (reenviando || !verificacao) return;

    setReenviando(true);
    setErro(undefined);

    try {
      const novo = await segurancaService.reenviarCodigo(verificacao.desafio);
      renovarVerificacao({ desafio: novo.desafioDispositivo, reenvioEmSegundos: novo.reenvioEmSegundos });
      setVerificacao(lerVerificacao());
      setAgora(Date.now());
      setPodePedirOutro(false);
      setCodigo("");
      setPedirFoco((n) => n + 1);
      toast.success(t("verificacao-de-dispositivo.enviamosUmNovoCodigoOAnterior"));
    } catch (falha) {
      if (desafioDeDispositivoVenceu(falha)) {
        limparVerificacao();
        toast.error(mensagemDeErroSeguranca(falha, t("verificacao-de-dispositivo.aVerificacaoExpirouEntre")));
        void navigate({ to: "/entrar", replace: true });
        return;
      }

      // Pediu cedo demais: o servidor diz quanto falta, e o relógio da tela acompanha.
      const espera = segundosDeEspera(falha);
      if (espera > 0) {
        setVerificacao((atual) => (atual ? { ...atual, enviadoEm: Date.now() - (atual.reenvioEmSegundos - espera) * 1000 } : atual));
        setAgora(Date.now());
        setPodePedirOutro(false);
      }

      setErro(mensagemDeErroSeguranca(falha, t("verificacao-de-dispositivo.naoFoiPossivelEnviarOutro")));
    } finally {
      setReenviando(false);
    }
  }

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <Link to="/" aria-label={t("verificacao-de-dispositivo.voltarParaAPaginaInicial")} className="inline-flex">
          <Logo />
        </Link>
        <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label={t("cabecalho.configAcessibilidade")}>
          <Link to="/configuracoes/acessibilidade">
            <Accessibility aria-hidden="true" />
            <span className="hidden sm:inline">{t("rodape.acessibilidade")}</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {contaPausada ? (
            <div className="space-y-4" role="status">
              <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
                {t("login.contaPausada")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("verificacao-de-dispositivo.oCodigoEstavaCertoMasPara")}
              </p>
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">{t("verificacao-de-dispositivo.voltarParaOLogin")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-5" noValidate aria-labelledby="titulo-dispositivo">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <MailCheck className="size-5" />
                </span>
                <div>
                  <h1 id="titulo-dispositivo" ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
                    {t("verificacao-de-dispositivo.confirmeEsteDispositivo")}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Frase
                      chave="verificacao-de-dispositivo.naoReconhecemosEsteDispositivo"
                      vars={{ email: verificacao.emailMascarado }}
                      partes={[(texto) => <strong>{texto}</strong>]}
                    />
                  </p>
                </div>
              </div>

              <PrazoDoCodigo enviadoEm={verificacao.enviadoEm} aoPedirMaisTempo={() => void pedirOutroCodigo()} podePedir={faltam <= 0} ocupado={enviando || reenviando} />

              <CampoCodigo
                id="codigo-dispositivo"
                rotulo={t("verificacao-de-dispositivo.codigoRecebidoPorEMail")}
                valor={codigo}
                aoMudar={(valor) => {
                  setCodigo(valor);
                  setErro(undefined);
                }}
                erro={erro}
                ajuda={t("verificacao-de-dispositivo.naoChegouOlheTambemACaixaDe")}
                desabilitado={enviando}
                refInput={campoRef}
              />

              <div className="flex items-start gap-3">
                <Checkbox id="lembrar-dispositivo" checked={lembrar} onCheckedChange={(valor) => setLembrar(valor === true)} disabled={enviando} className="mt-1" aria-describedby="ajuda-lembrar" />
                <div>
                  <Label htmlFor="lembrar-dispositivo" className="text-sm font-medium">
                    {t("verificacao-de-dispositivo.lembrarEsteDispositivo")}
                  </Label>
                  <p id="ajuda-lembrar" className="text-xs text-muted-foreground">
                    {t("verificacao-de-dispositivo.aquiNaoPediremosOCodigoPorE")}
                  </p>
                </div>
              </div>

              <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
                {enviando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> {t("verificacao-de-dispositivo.verificando")}
                  </>
                ) : (
                  t("verificacao-de-dispositivo.confirmarEEntrar")
                )}
              </Button>

              <div className="flex flex-col gap-1">
                <Button type="button" variant="link" className="min-h-11 justify-start px-0" onClick={pedirOutroCodigo} disabled={enviando || reenviando || faltam > 0}>
                  {reenviando ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" /> {t("comentario.enviando")}
                    </>
                  ) : faltam > 0 ? (
                    t("verificacao-de-dispositivo.pedirOutroCodigoEmS", { var1: faltam })
                  ) : (
                    t("verificacao-de-dispositivo.naoRecebiPedirOutroCodigo")
                  )}
                </Button>
                {/* Avisa uma única vez, quando a espera acaba, sem narrar a contagem inteira. */}
                <p role="status" className="sr-only">
                  {podePedirOutro && faltam <= 0 ? "Você já pode pedir outro código." : ""}
                </p>
                <Button asChild variant="ghost" className="min-h-11 justify-start px-0">
                  <Link to="/entrar" onClick={limparVerificacao}>
                    <ArrowLeft aria-hidden="true" /> {t("cadastro.google.voltarParaOLogin")}
                  </Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}
