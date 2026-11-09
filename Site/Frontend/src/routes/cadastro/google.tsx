import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconeGoogle } from "@/components/cadastro/BotaoGoogle";
import { AceiteTermos } from "@/components/cadastro/comuns";
import { VERSAO_DOCUMENTOS } from "@/dados/documentosLegais";
import { useSessao } from "@/hooks/useSessao";
import { lerProva, limparProva } from "@/lib/googleNavegador";
import googleService, { mensagemDeErroGoogle, perfilDaProvaGoogle } from "@/services/google.service";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

/**
 * Criar a conta direto do retorno do Google (etapa 6 da auditoria), quando o servidor está com a
 * criação sem senha ligada.
 *
 * É a única coisa que a pessoa faz antes de ter a conta: confere qual conta Google será usada e
 * **aceita os Termos de Uso e o Aviso de Privacidade**. O aceite vem antes de a conta existir, e não
 * depois, para nunca haver uma conta sem aceite registrado. Nome e e-mail vêm da prova que o servidor
 * assinou (guardada na aba por `retorno-google`); a pessoa não digita nenhum dos dois, então não há
 * como criar a conta no e-mail de outra pessoa. CPF, telefone, nascimento e endereço são pedidos logo
 * em seguida, já com a conta criada, em `/cadastro/dados`.
 *
 * Quem prefere definir uma senha e preencher tudo de uma vez segue para o cadastro de sempre, que
 * continua aceitando a mesma prova do Google.
 */
export const Route = createFileRoute("/cadastro/google")({
  validateSearch: z.object({
    /** `?depois=empresa`: quem veio por "Sou empresa" segue para o cadastro institucional ao final. */
    depois: z.enum(["empresa"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: textoDaPagina("cadastro.google.criarContaComOGoogleAcesso") },
      { name: "description", content: textoDaPagina("cadastro.google.crieSuaContaNoAcessoComOGoogle") },
    ],
  }),
  component: CadastroComGoogle,
});

function CadastroComGoogle() {
  const { t } = useIdioma();
  const { depois } = Route.useSearch();
  const navigate = useNavigate();
  const { iniciarSessao } = useSessao();
  const [aceitou, setAceitou] = useState(false);
  const [erroDoAceite, setErroDoAceite] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // Lida uma vez: a prova fica na aba (`sessionStorage`) e vence em 15 minutos.
  const prova = useMemo(() => lerProva(), []);
  const perfil = useMemo(() => perfilDaProvaGoogle(prova), [prova]);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  async function criar() {
    if (criando) return;

    if (!aceitou) {
      setErroDoAceite(t("cadastro.google.aceiteOsTermosDeUsoEOAvisoDe"));
      return;
    }

    setErroDoAceite(undefined);
    setErro(null);
    setCriando(true);

    try {
      const sessao = await googleService.cadastrar(prova!, VERSAO_DOCUMENTOS);
      // A prova cumpriu o papel e não deve ficar na aba para outro cadastro.
      limparProva();
      await iniciarSessao(sessao);
      toast.success(t("cadastro.google.contaCriadaComOGoogle"));
      // `replace`: o botão "voltar" não pode reabrir esta tela e tentar criar de novo.
      void navigate({ to: "/cadastro/dados", search: { depois }, replace: true });
    } catch (falha) {
      const mensagem = mensagemDeErroGoogle(falha, t("cadastro.google.naoFoiPossivelCriarAContaAgora"));
      setErro(mensagem);
      toast.error(mensagem);
      setCriando(false);
    }
  }

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label={t("auth.voltarPaginaInicial")} className="inline-flex">
          <Logo />
        </Link>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {!prova || !perfil?.email ? (
            <div role="alert" className="space-y-4">
              <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
                {t("cadastro.google.aVerificacaoComOGoogleExpirou")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("cadastro.google.porSegurancaElaValePorPoucos")}
              </p>
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">{t("cadastro.google.voltarParaOLogin")}</Link>
              </Button>
            </div>
          ) : (
            <form
              noValidate
              className="space-y-6"
              onSubmit={(evento) => {
                evento.preventDefault();
                void criar();
              }}
            >
              <div>
                <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
                  {t("cadastro.google.criarContaComOGoogle")}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("cadastro.google.faltaSoUmPassoDepoisPedimos")}
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
                <span className="mt-0.5 shrink-0">
                  <IconeGoogle />
                </span>
                <p className="min-w-0 text-sm">
                  <span className="font-semibold">{t("cadastro.google.contaGoogleConfirmada")}</span>{" "}
                  {perfil.nome && <span className="block break-words font-medium">{perfil.nome}</span>}
                  <span className="block break-all text-muted-foreground">{perfil.email}</span>
                </p>
              </div>

              <AceiteTermos
                id="termos-google"
                marcado={aceitou}
                aoMarcar={(valor) => {
                  setAceitou(valor);
                  if (valor) setErroDoAceite(undefined);
                }}
                erro={erroDoAceite}
                enviando={criando}
                obrigatorio
                dicaObrigatorio={t("cadastro.google.campoObrigatorio")}
              />

              {erro && (
                <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm">
                  <p className="font-medium text-destructive">{erro}</p>
                  <p className="text-muted-foreground">
                    {t("cadastro.google.jaTemContaNoAcesso")}{" "}
                    <Link to="/entrar" className="font-semibold text-primary underline underline-offset-2">
                      {t("cadastro.google.entreComEla")}
                    </Link>
                    .
                  </p>
                </div>
              )}

              <Button type="submit" className="min-h-12 w-full text-base" disabled={criando}>
                {criando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> {t("cadastro.google.criandoSuaConta")}
                  </>
                ) : (
                  t("inicio.criarMinhaConta")
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("cadastro.google.prefereDefinirUmaSenhaE")}{" "}
                <Link
                  to="/cadastro/candidato"
                  search={{ google: true, depois }}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  {t("cadastro.google.cadastroCompleto")}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}
