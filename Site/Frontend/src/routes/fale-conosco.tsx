import { useEffect, useRef, useState } from "react";
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
import { useSessao } from "@/hooks/useSessao";
import { cn } from "@/lib/utils";
import { extrairMensagemErro } from "@/services/api";
import contatoService from "@/services/contato.service";

export const Route = createFileRoute("/fale-conosco")({
  head: () => ({
    meta: [
      { title: "Fale conosco — ACESSO" },
      { name: "description", content: "Entre em contato com a equipe do ACESSO: dúvidas, problemas, sugestões e pedidos sobre seus dados." },
    ],
  }),
  component: FaleConosco,
});

const CHAVES_DE_ASSUNTO = Object.keys(ASSUNTOS_DE_CONTATO) as [AssuntoDeContato, ...AssuntoDeContato[]];

const esquema = z.object({
  nome: esquemaNome({
    erroNome: "Informe o seu nome (ao menos 3 caracteres).",
    erroNomeCaracteres: "Use só letras, espaços, hífen, apóstrofo e ponto. Não use números nem símbolos.",
  }),
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail em que quer receber a resposta.")
    .email("Esse e-mail não parece válido. Confira se digitou tudo.")
    .max(LIMITES_DE_CONTATO.emailMaximo, `O e-mail deve ter no máximo ${LIMITES_DE_CONTATO.emailMaximo} caracteres.`),
  assunto: z.enum(CHAVES_DE_ASSUNTO, { errorMap: () => ({ message: "Escolha um assunto." }) }),
  mensagem: z
    .string()
    .trim()
    .min(LIMITES_DE_CONTATO.mensagemMinimo, `Escreva ao menos ${LIMITES_DE_CONTATO.mensagemMinimo} caracteres.`)
    .max(LIMITES_DE_CONTATO.mensagemMaximo, `A mensagem pode ter no máximo ${LIMITES_DE_CONTATO.mensagemMaximo} caracteres.`),
  // Campo-isca (ver abaixo): fica vazio para qualquer pessoa.
  website: z.string(),
});

type Formulario = z.infer<typeof esquema>;

/** Código HTTP da resposta de erro, quando houver (para distinguir "indisponível" de "limite"). */
function statusDoErro(erro: unknown): number | undefined {
  return (erro as { response?: { status?: number } })?.response?.status;
}

function FaleConosco() {
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
    resolver: zodResolver(esquema),
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
      toast.error(extrairMensagemErro(erro, "Não foi possível enviar a sua mensagem agora. Tente de novo em instantes."));
    }
  });

  const tamanho = (watch("mensagem") ?? "").length;

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
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
                Mensagem enviada
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Recebemos a sua mensagem e vamos responder para <strong className="text-foreground">{enviadoPara}</strong>.
              </p>
              <p className="mt-4 text-sm">
                Protocolo: <strong className="font-mono">{protocolo}</strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Guarde este número para citar a mensagem em um contato futuro.</p>
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
                  Enviar outra mensagem
                </Button>
                <Button asChild className="min-h-12">
                  <Link to="/">Voltar ao início</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={aoEnviar} noValidate className="space-y-5">
              <div>
                <h1 className="text-2xl font-extrabold">Fale conosco</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Dúvidas, problemas, sugestões ou pedidos sobre os seus dados: escreva para a equipe do ACESSO.
                </p>
              </div>

              <LegendaObrigatorio texto="Campo obrigatório" />

              <Campo id="nome" rotulo="Seu nome" erro={errors.nome?.message} obrigatorio dicaObrigatorio="Campo obrigatório">
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
                rotulo="E-mail para resposta"
                ajuda="Só usamos o seu e-mail para responder a esta mensagem."
                erro={errors.email?.message}
                obrigatorio
                dicaObrigatorio="Campo obrigatório"
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

              <Campo id="assunto" rotulo="Assunto" erro={errors.assunto?.message} obrigatorio dicaObrigatorio="Campo obrigatório">
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
                    Escolha um assunto
                  </option>
                  {CHAVES_DE_ASSUNTO.map((chave) => (
                    <option key={chave} value={chave}>
                      {ASSUNTOS_DE_CONTATO[chave]}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo
                id="mensagem"
                rotulo="Mensagem"
                ajuda={`${tamanho} de ${LIMITES_DE_CONTATO.mensagemMaximo} caracteres. Não escreva senhas nem números de documentos.`}
                erro={errors.mensagem?.message}
                obrigatorio
                dicaObrigatorio="Campo obrigatório"
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
                <label htmlFor="website">Não preencha este campo</label>
                <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
              </div>

              {indisponivel && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                  <p className="font-semibold">O envio por aqui não está disponível agora.</p>
                  <p className="mt-1 text-muted-foreground">
                    Você pode escrever direto para{" "}
                    <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-semibold text-primary underline underline-offset-2">
                      {EMAIL_DE_CONTATO}
                    </a>
                    .
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Ao enviar, você concorda que a equipe leia a mensagem para responder. Veja como tratamos os dados no{" "}
                <Link to="/privacidade" className="font-semibold text-primary underline underline-offset-2">
                  Aviso de Privacidade
                </Link>
                .
              </p>

              <Button type="submit" className="min-h-12 w-full text-base" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> Enviando…
                  </>
                ) : (
                  <>
                    <Mail aria-hidden="true" /> Enviar mensagem
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!protocolo && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Prefere e-mail? Escreva para{" "}
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-semibold text-primary underline underline-offset-2">
            {EMAIL_DE_CONTATO}
          </a>
          .
        </p>
      )}
    </AutenticacaoLayout>
  );
}
