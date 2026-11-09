import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Accessibility, ArrowLeft, Loader2, MailCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { esquecerDispositivoConfiavel } from "@/services/api";
import segurancaService, { codigoDoErroSeguranca, mensagemDeErroSeguranca } from "@/services/seguranca.service";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

/**
 * "Acho que invadiram minha conta", para quem NÃO está logado (ou já perdeu o acesso).
 *
 * - Sem `token`: pede o e-mail. A resposta é sempre a mesma, exista a conta ou não; o link só chega ao e-mail da conta.
 * - Com `token` (o link do e-mail, tanto do pedido quanto do "Não fui eu" do aviso de novo acesso): uma confirmação por clique,
 *   e não ao abrir a página, para um programa que pré-visualiza links não proteger a conta (nem a gastar o link) sem a pessoa.
 *
 * Proteger encerra todas as sessões e remove a confiança nos dispositivos; manda o link de nova senha.
 */
export const Route = createFileRoute("/conta-comprometida")({
  // `z.coerce.string()`: o parser de search params converte valor só com dígitos em número (ver `redefinir-senha.tsx`).
  validateSearch: z.object({ token: z.coerce.string().optional() }),
  head: () => ({
    meta: [
      { title: textoDaPagina("conta-comprometida.protegerMinhaContaAcesso") },
      { name: "description", content: textoDaPagina("conta-comprometida.encerreTodasAsSessoesDaSua") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContaComprometida,
});

function Cabecalho() {
  const { t } = useIdioma();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
      <Link to="/" aria-label={t("auth.voltarPaginaInicial")} className="inline-flex">
        <Logo />
      </Link>
      <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label={t("cabecalho.configAcessibilidade")}>
        <Link to="/configuracoes/acessibilidade">
          <Accessibility aria-hidden="true" />
          <span className="hidden sm:inline">{t("rodape.acessibilidade")}</span>
        </Link>
      </Button>
    </div>
  );
}

function ContaComprometida() {
  const { token } = Route.useSearch();
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, [token]);

  return (
    <AutenticacaoLayout className="max-w-lg">
      <Cabecalho />
      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">{token ? <Confirmar token={token} tituloRef={tituloRef} /> : <Pedir tituloRef={tituloRef} />}</CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}

function Pedir({ tituloRef }: { tituloRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = useIdioma();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const enviandoRef = useRef(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current) return;

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErro(t("login.erroEmailFormato"));
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErro(undefined);

    try {
      setMensagem(await segurancaService.solicitarProtecao(email.trim()));
    } catch (falha) {
      setErro(mensagemDeErroSeguranca(falha, t("conta-comprometida.naoFoiPossivelEnviarAgoraTente")));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  if (mensagem) {
    return (
      <div className="space-y-4" role="status">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <MailCheck className="size-5" />
          </span>
          <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
            {t("conta-comprometida.verifiqueOSeuEMail")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{mensagem}</p>
        <Button asChild className="min-h-12 w-full text-base">
          <Link to="/entrar">{t("conta-comprometida.voltarParaOLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate aria-labelledby="titulo-conta-comprometida">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldAlert className="size-5" />
        </span>
        <div>
          <h1 id="titulo-conta-comprometida" ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
            {t("login.contaComprometida")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("conta-comprometida.informeOEMailDaConta")}
          </p>
        </div>
      </div>

      <Campo id="email-protecao" rotulo={t("conta-comprometida.eMailDaConta")} erro={erro}>
        <Input
          id="email-protecao"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(evento) => {
            setEmail(evento.target.value);
            setErro(undefined);
          }}
          disabled={enviando}
          className="min-h-12"
          aria-invalid={Boolean(erro)}
          aria-describedby={descricao("email-protecao", false, Boolean(erro))}
        />
      </Campo>

      <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> {t("comentario.enviando")}
          </>
        ) : (
          t("conta-comprometida.enviarLinkDeProtecao")
        )}
      </Button>

      <Button asChild variant="ghost" className="min-h-11 justify-start px-0">
        <Link to="/entrar">
          <ArrowLeft aria-hidden="true" /> {t("cadastro.google.voltarParaOLogin")}
        </Link>
      </Button>
    </form>
  );
}

function Confirmar({ token, tituloRef }: { token: string; tituloRef: React.RefObject<HTMLHeadingElement | null> }) {
  const { t } = useIdioma();
  const [enviando, setEnviando] = useState(false);
  const [protegida, setProtegida] = useState<string | null>(null);
  const [erro, setErro] = useState<string | undefined>();
  const [linkInvalido, setLinkInvalido] = useState(false);
  const enviandoRef = useRef(false);

  async function proteger() {
    if (enviandoRef.current) return;

    enviandoRef.current = true;
    setEnviando(true);
    setErro(undefined);

    try {
      setProtegida(await segurancaService.confirmarProtecao(token));
      esquecerDispositivoConfiavel();
    } catch (falha) {
      if (codigoDoErroSeguranca(falha) === "LINK_DE_SEGURANCA_INVALIDO") {
        setLinkInvalido(true);
      } else {
        setErro(mensagemDeErroSeguranca(falha, t("conta-comprometida.naoFoiPossivelProtegerAConta")));
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  if (protegida) {
    return (
      <div className="space-y-4" role="status">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
            {t("conta-comprometida.contaProtegida")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{protegida}</p>
        <p className="text-sm text-muted-foreground">{t("conta-comprometida.abraOEMailQueAcabamosDeEnviar")}</p>
        <Button asChild className="min-h-12 w-full text-base">
          <Link to="/entrar">{t("conta-comprometida.irParaOLogin")}</Link>
        </Button>
      </div>
    );
  }

  if (linkInvalido) {
    return (
      <div className="space-y-4" role="alert">
        <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
          {t("conta-comprometida.esteLinkNaoValeMais")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("conta-comprometida.oLinkExpirouOuJaFoiUsadoPecaUm")}</p>
        <Button asChild className="min-h-12 w-full text-base">
          <Link to="/conta-comprometida" search={{ token: undefined }}>
            {t("conta-comprometida.pedirUmNovoLink")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldAlert className="size-5" />
        </span>
        <div>
          <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
            {t("conta-comprometida.protegerASuaConta")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("conta-comprometida.aoConfirmarTodasAsSessoes")}
          </p>
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <Button type="button" variant="destructive" className="min-h-12 w-full text-base" onClick={proteger} disabled={enviando}>
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> {t("configuracoes.secaoContaComprometida.protegendo")}
          </>
        ) : (
          t("conta-comprometida.protegerMinhaConta")
        )}
      </Button>

      <Button asChild variant="ghost" className="min-h-11 justify-start px-0">
        <Link to="/entrar">
          <ArrowLeft aria-hidden="true" /> {t("conta-comprometida.naoEIssoVoltarParaOLogin")}
        </Link>
      </Button>
    </div>
  );
}
