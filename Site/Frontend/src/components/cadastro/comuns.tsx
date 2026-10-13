import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PainelAcessibilidade } from "@/components/acessibilidade/PainelAcessibilidade";
import { DocumentoLegalDialog } from "@/components/legal/DocumentoLegalDialog";
import { MarcaObrigatorio } from "@/components/cadastro/MarcaObrigatorio";
import { PassosCadastro } from "@/components/cadastro/PassosCadastro";
import type { TextosCadastro } from "@/components/cadastro/idioma";
import { useSessao } from "@/hooks/useSessao";
import autenticacaoService from "@/services/autenticacao.service";
import { extrairMensagemErro } from "@/services/api";
import { cn } from "@/lib/utils";

/**
 * Peças usadas pelos dois cadastros, que a partir da separação em `/cadastro/candidato` e
 * `/cadastro/empresa` vivem fora das rotas para não serem duplicadas nem divergirem.
 */

/**
 * Título da etapa. Recebe foco a cada troca de etapa, porque o conteúdo muda inteiro debaixo de
 * quem navega por teclado e o foco ficaria num botão que acabou de sumir.
 *
 * `focar` é falso na primeira carga da página: ali o foco precisa ficar no começo do documento,
 * senão o link "Pular para o conteúdo principal" e o cabeçalho ficam para trás do foco e só são
 * alcançáveis com Shift+Tab.
 */
export function TituloEtapa({
  titulo,
  descricao: texto,
  focar = true,
}: {
  titulo: string;
  descricao: string;
  focar?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focar) ref.current?.focus();
    // `focar` fica de fora de propósito: o que dispara o foco é a troca de etapa, não o valor dele.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo]);

  return (
    <div className="mb-6">
      <h1 ref={ref} tabIndex={-1} className="text-2xl font-extrabold outline-none">
        {titulo}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

export function NavegacaoEtapa({
  primeiraEtapa,
  enviando,
  rotuloAvancar,
  aoVoltar,
  acaoSecundaria,
  rotuloVoltar = "Voltar",
  rotuloEnviando = "Enviando…",
}: {
  primeiraEtapa: boolean;
  enviando: boolean;
  rotuloAvancar: string;
  aoVoltar?: () => void;
  acaoSecundaria?: { rotulo: string; aoClicar: () => void };
  /** Textos no idioma escolhido. O padrão em português serve ao cadastro de empresa. */
  rotuloVoltar?: string;
  rotuloEnviando?: string;
}) {
  return (
    <div className="mt-8 space-y-3">
      <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> {rotuloEnviando}
          </>
        ) : (
          <>
            {rotuloAvancar} <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-between">
        {acaoSecundaria && (
          <Button type="button" variant="ghost" className="min-h-11" onClick={acaoSecundaria.aoClicar} disabled={enviando}>
            {acaoSecundaria.rotulo}
          </Button>
        )}
        {!primeiraEtapa && aoVoltar && (
          <Button type="button" variant="outline" className="min-h-11" onClick={aoVoltar} disabled={enviando}>
            <ArrowLeft aria-hidden="true" /> {rotuloVoltar}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Aceite dos documentos legais, igual nos dois cadastros.
 *
 * Os dois nomes são botões que abrem o documento para leitura num diálogo, e ficam **dentro** do
 * rótulo mas **fora** do checkbox: clicar para ler nunca marca o aceite, e marcar o aceite continua
 * sendo um ato separado. Diálogo, e não navegação, para o formulário preenchido não se perder.
 */
export function AceiteTermos({
  id,
  marcado,
  aoMarcar,
  erro,
  enviando,
  textos,
  obrigatorio,
  dicaObrigatorio,
}: {
  id: string;
  marcado: boolean;
  aoMarcar: (valor: boolean) => void;
  erro?: string;
  enviando: boolean;
  /** Partes da frase no idioma escolhido. Sem elas, o texto em português. */
  textos?: {
    antes: string;
    linkUso: string;
    entre: string;
    linkPrivacidade: string;
    depois: string;
  };
  obrigatorio?: boolean;
  dicaObrigatorio?: string;
}) {
  const t = textos ?? {
    antes: "Li e aceito os",
    linkUso: "Termos de Uso",
    entre: "e a",
    linkPrivacidade: "Política de Privacidade",
    depois: "do ACESSO.",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={marcado}
          onCheckedChange={(valor) => aoMarcar(valor === true)}
          disabled={enviando}
          required={obrigatorio}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? `${id}-erro` : undefined}
          className="mt-1"
        />
        <Label htmlFor={id} className="text-sm font-normal leading-relaxed text-muted-foreground">
          {t.antes} <DocumentoLegalDialog documento="termos">{t.linkUso}</DocumentoLegalDialog> {t.entre}{" "}
          <DocumentoLegalDialog documento="privacidade">{t.linkPrivacidade}</DocumentoLegalDialog>{" "}
          {t.depois}
          {obrigatorio && <MarcaObrigatorio texto={dicaObrigatorio} />}
        </Label>
      </div>
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}



/** Botão da última etapa: marca o cadastro como concluído e leva ao feed. */
export function BotaoFinalizar({
  t,
  seguirParaEmpresa,
}: {
  t: TextosCadastro;
  /** Quem veio por "Sou empresa" emenda no cadastro institucional em vez de cair no feed. */
  seguirParaEmpresa?: boolean;
}) {
  const navigate = useNavigate();
  const { atualizar } = useSessao();
  const [enviando, setEnviando] = useState(false);

  async function finalizar() {
    if (enviando) return;
    setEnviando(true);
    try {
      const usuario = await autenticacaoService.concluirCadastro();
      atualizar({ cadastroConcluidoEm: usuario.cadastroConcluidoEm });
      navigate({ to: seguirParaEmpresa ? "/cadastro/empresa" : "/feed" });
    } catch (erro) {
      // O backend recusa concluir com campo obrigatório do perfil em branco; a mensagem dele diz
      // exatamente o que falta, então vale mais que um texto genérico daqui.
      toast.error(extrairMensagemErro(erro, t.erroPerfilGenerico));
      setEnviando(false);
    }
  }

  return (
    <Button type="button" className="mt-8 min-h-12 w-full text-base" disabled={enviando} onClick={finalizar}>
      {enviando ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" /> {t.finalizando}
        </>
      ) : (
        <>
          {seguirParaEmpresa ? "Continuar para o cadastro da empresa" : t.finalizar}{" "}
          <ArrowRight aria-hidden="true" />
        </>
      )}
    </Button>
  );
}


/**
 * Última etapa: reaproveita o painel que já existe, com pré-visualização em tempo real.
 *
 * É aqui que o cadastro é marcado como terminado (`POST /auth/cadastro/concluir`). Enquanto essa
 * chamada não acontece, `cadastroConcluidoEm` fica nula e o login continua oferecendo retomar — o
 * que é exatamente o que deve acontecer se a pessoa fechar a aba nesta tela.
 */
export function EtapaAcessibilidade({ passos, indice }: { passos: readonly string[]; indice: number }) {
  const navigate = useNavigate();
  const { atualizar } = useSessao();
  const [enviando, setEnviando] = useState(false);

  async function finalizar() {
    if (enviando) return;
    setEnviando(true);
    try {
      const usuario = await autenticacaoService.concluirCadastro();
      atualizar({ cadastroConcluidoEm: usuario.cadastroConcluidoEm });
    } catch {
      // Não trava a pessoa na última tela por causa disso: o pior caso é o login oferecer retomar
      // de novo, e as preferências de acessibilidade já foram salvas pelo próprio painel.
    } finally {
      setEnviando(false);
      navigate({ to: "/feed" });
    }
  }

  return (
    <div>
      <PassosCadastro passos={passos} atual={indice} />
      <TituloEtapa
        titulo="Deixe o ACESSO do seu jeito"
        descricao="Ajuste o que precisar e veja o resultado na hora. Você pode mudar tudo depois, em Configurações."
      />

      <PainelAcessibilidade />

      <Button type="button" className="mt-8 min-h-12 w-full text-base" disabled={enviando} onClick={finalizar}>
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> Finalizando…
          </>
        ) : (
          <>
            Finalizar cadastro <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </div>
  );
}


/**
 * Mostrada no lugar do formulário quando o cadastro **de empresa** é criado com confirmação de
 * e-mail pendente (provedor configurado no backend): ali ainda não há sessão.
 *
 * Candidato não passa mais por aqui: o cadastro dele deixou de exigir confirmação e já devolve
 * sessão. A confirmação continua existindo para empresa e para troca de endereço — o que saiu foi
 * só a obrigatoriedade no cadastro de candidato.
 *
 * O indicador de etapas some de propósito e dá lugar a uma linha do tempo que diz, sem rodeio, que
 * o cadastro **não** terminou. Fingir que tudo foi concluído aqui seria mentira.
 */
export function ConfirmeSeuEmail({ email }: { email: string }) {
  const [enviando, setEnviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  async function reenviar() {
    setEnviando(true);
    try {
      await autenticacaoService.reenviarConfirmacaoCadastro(email);
      setReenviado(true);
      toast.success("Um novo e-mail de confirmação foi enviado.");
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível reenviar o e-mail agora."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"
        >
          <Mail className="size-5" />
        </span>
        <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
          Falta confirmar seu e-mail
        </h1>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Sua conta foi criada, mas o cadastro ainda não terminou. Enviamos um e-mail de confirmação
        para <strong className="text-foreground">{email}</strong> — verifique a caixa de entrada e também a
        pasta de spam.
      </p>

      <ol className="mt-5 space-y-3" aria-label="O que falta para terminar o cadastro">
        {[
          { feito: true, texto: "Dados da empresa" },
          { feito: false, texto: "Confirmar o e-mail", agora: true },
          { feito: false, texto: "Entrar na sua conta" },
          { feito: false, texto: "Análise do cadastro pela equipe do ACESSO" },
        ].map((item, indice) => (
          <li key={item.texto} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                item.feito && "border-primary bg-primary text-primary-foreground",
                item.agora && "border-primary text-primary",
                !item.feito && !item.agora && "border-border text-muted-foreground",
              )}
            >
              {item.feito ? <Check className="size-3.5" /> : indice + 1}
            </span>
            <span className={item.agora ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {item.texto}
            </span>
            {/* Estado em texto, nunca só pela cor nem pelo ✓. */}
            <span className="sr-only">
              {item.feito ? "concluído" : item.agora ? "é o que falta agora" : "ainda não feito"}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-sm text-muted-foreground">
        Prefere digitar o código de 6 dígitos que veio no e-mail? Você também pode{" "}
        <Link to="/confirmar-email" search={{ email }} className="font-semibold text-primary underline">
          confirmar por código
        </Link>
        .
      </p>
      <p className="mt-4 rounded-lg bg-primary-soft px-3 py-2 text-sm">
        Depois de entrar, retomamos seu cadastro de onde você parou — nada do que você preencheu se
        perde.
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-6 min-h-11 w-full"
        disabled={enviando || reenviado}
        onClick={reenviar}
      >
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> Reenviando…
          </>
        ) : reenviado ? (
          "E-mail reenviado"
        ) : (
          "Reenviar e-mail"
        )}
      </Button>
    </div>
  );
}
