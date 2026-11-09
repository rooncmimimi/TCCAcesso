import { useMemo, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { LegendaObrigatorio } from "@/components/cadastro/MarcaObrigatorio";
import { esquemaNome } from "@/components/cadastro/regrasPessoais";
import {
  ASSUNTOS_DE_CONTATO,
  EMAIL_DE_CONTATO,
  LIMITES_DE_CONTATO,
  type AssuntoDeContato,
} from "@/dados/assuntosDeContato";
import { Frase } from "@/i18n/Frase";
import type { TFuncao } from "@/contexts/IdiomaContext";
import { textoDaPagina } from "@/i18n/textoDaPagina";
import { useIdioma } from "@/hooks/useIdioma";
import { useSessao } from "@/hooks/useSessao";
import { cn } from "@/lib/utils";
import { extrairMensagemErro } from "@/services/api";
import contatoService from "@/services/contato.service";

export const Route = createFileRoute("/fale-conosco")({
  head: () => ({
    meta: [
      { title: textoDaPagina("fale-conosco.faleConoscoAcesso") },
      { name: "description", content: textoDaPagina("fale-conosco.entreEmContatoComAEquipeDo") },
    ],
  }),
  component: FaleConosco,
});

const CHAVES_DE_ASSUNTO = Object.keys(ASSUNTOS_DE_CONTATO) as [AssuntoDeContato, ...AssuntoDeContato[]];

/** O esquema nasce do idioma atual: as mensagens de erro saem na língua da tela. */
const criarEsquema = (t: TFuncao) =>
  z.object({
    nome: esquemaNome({
      erroNome: t("faleConosco.erroNome"),
      erroNomeCaracteres: t("validacao.nomeCaracteres"),
    }),
    email: z
      .string()
      .trim()
      .min(1, t("faleConosco.erroEmail"))
      .email(t("faleConosco.erroEmailFormato"))
      .max(LIMITES_DE_CONTATO.emailMaximo, t("faleConosco.erroEmailTamanho", { maximo: LIMITES_DE_CONTATO.emailMaximo })),
    assunto: z.enum(CHAVES_DE_ASSUNTO, { errorMap: () => ({ message: t("faleConosco.erroAssunto") }) }),
    mensagem: z
      .string()
      .trim()
      .min(LIMITES_DE_CONTATO.mensagemMinimo, t("faleConosco.erroMensagemMinimo", { minimo: LIMITES_DE_CONTATO.mensagemMinimo }))
      .max(LIMITES_DE_CONTATO.mensagemMaximo, t("faleConosco.erroMensagemMaximo", { maximo: LIMITES_DE_CONTATO.mensagemMaximo })),
    // Campo-isca (ver abaixo): fica vazio para qualquer pessoa.
    website: z.string(),
  });

type Formulario = z.infer<ReturnType<typeof criarEsquema>>;

/** Código HTTP da resposta de erro, quando houver (para distinguir "indisponível" de "limite"). */
function statusDoErro(erro: unknown): number | undefined {
  return (erro as { response?: { status?: number } })?.response?.status;
}

function FaleConosco() {
  const { t } = useIdioma();
  const { usuario } = useSessao();
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [enviadoPara, setEnviadoPara] = useState("");
  const [indisponivel, setIndisponivel] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(useMemo(() => criarEsquema(t), [t])),
    mode: "onTouched",
    defaultValues: { nome: "", email: "", assunto: undefined, mensagem: "", website: "" },
  });

  // Quem está logado já informou nome e e-mail: vêm preenchidos, e dá para trocar.
  useEffect(() => {
    if (usuario) reset((atual) => ({ ...atual, nome: atual.nome || usuario.nome || "", email: atual.email || usuario.email || "" }));
  }, [usuario, reset]);

  // Ao trocar de tela (formulário → confirmação), o foco vai para o título novo.
  useEffect(() => {
    if (protocolo) tituloRef.current?.focus();
  }, [protocolo]);

  const aoEnviar = handleSubmit(async (valores) => {
    setIndisponivel(false);

    try {
      const resposta = await contatoService.enviar(valores);
      setEnviadoPara(valores.email);
      setProtocolo(resposta.protocolo);
    } catch (erro) {
      // 503: o envio de e-mails não está configurado ou o provedor falhou; a pessoa precisa saber disso e ter outro caminho.
      if (statusDoErro(erro) === 503) setIndisponivel(true);
      toast.error(extrairMensagemErro(erro, t("fale-conosco.naoFoiPossivelEnviarASua")));
    }
  });

  const tamanho = (watch("mensagem") ?? "").length;

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label={t("auth.voltarPaginaInicial")} className="inline-flex">
          <Logo />
        </Link>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {protocolo ? (
            <div className="text-center" role="status">
              <div className="grid place-items-center">
                <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
              </div>
              <h1 ref={tituloRef} tabIndex={-1} className="mt-4 text-xl font-extrabold outline-none">
                {t("fale-conosco.mensagemEnviada")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                <Frase
                  chave="fale-conosco.recebemosASuaMensagem"
                  vars={{ email: enviadoPara }}
                  partes={[(texto) => <strong className="text-foreground">{texto}</strong>]}
                />
              </p>
              <p className="mt-4 text-sm">
                <Frase
                  chave="fale-conosco.protocolo"
                  vars={{ protocolo }}
                  partes={[(texto) => <strong className="font-mono">{texto}</strong>]}
                />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("fale-conosco.guardeEsteNumeroParaCitarA")}</p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12"
                  onClick={() => {
                    setProtocolo(null);
                    reset({ nome: usuario?.nome ?? "", email: usuario?.email ?? "", assunto: undefined, mensagem: "", website: "" });
                  }}
                >
                  {t("fale-conosco.enviarOutraMensagem")}
                </Button>
                <Button asChild className="min-h-12">
                  <Link to="/">{t("raiz.voltarInicio")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={aoEnviar} noValidate className="space-y-5">
              <div>
                <h1 className="text-2xl font-extrabold">{t("rodape.faleConosco")}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("fale-conosco.duvidasProblemasSugestoes")}
                </p>
              </div>

              <LegendaObrigatorio texto={t("fale-conosco.campoObrigatorio")} />

              <Campo id="nome" rotulo={t("fale-conosco.seuNome")} erro={errors.nome?.message} obrigatorio dicaObrigatorio={t("fale-conosco.campoObrigatorio")}>
                <Input
                  id="nome"
                  required
                  className="min-h-12"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.nome)}
                  aria-describedby={descricao("nome", false, Boolean(errors.nome))}
                  {...register("nome")}
                />
              </Campo>

              <Campo
                id="email"
                rotulo={t("fale-conosco.eMailParaResposta")}
                ajuda={t("fale-conosco.soUsamosOSeuEMailParaResponder")}
                erro={errors.email?.message}
                obrigatorio
                dicaObrigatorio={t("fale-conosco.campoObrigatorio")}
              >
                <Input
                  id="email"
                  type="email"
                  required
                  className="min-h-12"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={descricao("email", true, Boolean(errors.email))}
                  {...register("email")}
                />
              </Campo>

              <Campo id="assunto" rotulo={t("fale-conosco.assunto")} erro={errors.assunto?.message} obrigatorio dicaObrigatorio={t("fale-conosco.campoObrigatorio")}>
                <select
                  id="assunto"
                  required
                  defaultValue=""
                  aria-invalid={Boolean(errors.assunto)}
                  aria-describedby={descricao("assunto", false, Boolean(errors.assunto))}
                  className={cn(
                    "flex min-h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
                  )}
                  {...register("assunto")}
                >
                  <option value="" disabled>
                    {t("fale-conosco.escolhaUmAssunto")}
                  </option>
                  {CHAVES_DE_ASSUNTO.map((chave) => (
                    <option key={chave} value={chave}>
                      {t(ASSUNTOS_DE_CONTATO[chave])}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo
                id="mensagem"
                rotulo={t("fale-conosco.mensagem")}
                ajuda={t("fale-conosco.deCaracteresNaoEscrevaSenhas", { var1: tamanho, var2: LIMITES_DE_CONTATO.mensagemMaximo })}
                erro={errors.mensagem?.message}
                obrigatorio
                dicaObrigatorio={t("fale-conosco.campoObrigatorio")}
              >
                <Textarea
                  id="mensagem"
                  required
                  rows={6}
                  maxLength={LIMITES_DE_CONTATO.mensagemMaximo}
                  className="min-h-36"
                  aria-invalid={Boolean(errors.mensagem)}
                  aria-describedby={descricao("mensagem", true, Boolean(errors.mensagem))}
                  {...register("mensagem")}
                />
              </Campo>

              {/*
                Campo-isca contra robôs: fora da tela, fora da ordem de tabulação e escondido dos leitores de
                tela. Pessoa nenhuma o encontra; um robô que preenche tudo o preenche, e a mensagem é descartada.
              */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">{t("fale-conosco.naoPreenchaEsteCampo")}</label>
                <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
              </div>

              {indisponivel && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                  <p className="font-semibold">{t("fale-conosco.oEnvioPorAquiNaoEstaDisponivel")}</p>
                  <p className="mt-1 text-muted-foreground">
                    {t("fale-conosco.vocePodeEscreverDiretoPara")}{" "}
                    <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-semibold text-primary underline underline-offset-2">
                      {EMAIL_DE_CONTATO}
                    </a>
                    .
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t("fale-conosco.aoEnviarVoceConcordaQueAEquipe")}{" "}
                <Link to="/privacidade" className="font-semibold text-primary underline underline-offset-2">
                  {t("rodape.privacidade")}
                </Link>
                .
              </p>

              <Button type="submit" className="min-h-12 w-full text-base" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> {t("comentario.enviando")}
                  </>
                ) : (
                  <>
                    <Mail aria-hidden="true" /> {t("mensagens.janelaConversa.enviarMensagem")}
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!protocolo && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("fale-conosco.prefereEMailEscrevaPara")}{" "}
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-semibold text-primary underline underline-offset-2">
            {EMAIL_DE_CONTATO}
          </a>
          .
        </p>
      )}
    </AutenticacaoLayout>
  );
}
