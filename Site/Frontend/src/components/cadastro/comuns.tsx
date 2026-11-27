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
import { limparEtapa } from "@/lib/etapaCadastro";
import { cn } from "@/lib/utils";
import { useIdioma } from "@/hooks/useIdioma";
import { Frase } from "@/i18n/Frase";
import type { ChaveBase } from "@/i18n/dicionarios";
import { tx } from "@/i18n/frases";

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
  rotuloVoltar = tx("Voltar"),
  rotuloEnviando = tx("Enviando…"),
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
    antes: tx("Li e aceito os"),
    linkUso: tx("Termos de Uso"),
    entre: "e a",
    linkPrivacidade: tx("Política de Privacidade"),
    depois: tx("do ACESSO."),
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
      atualizar({
        cadastroConcluidoEm: usuario.cadastroConcluidoEm,
        cadastroPendente: false,
        dadosCadastroPendentes: [],
      });
      limparEtapa();
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
          {seguirParaEmpresa ? tx("Continuar para o cadastro da empresa") : t.finalizar}{" "}
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
  const { t } = useIdioma();
  const navigate = useNavigate();
  const { atualizar } = useSessao();
  const [enviando, setEnviando] = useState(false);

  async function finalizar() {
    if (enviando) return;
    setEnviando(true);
    try {
      const usuario = await autenticacaoService.concluirCadastro();
      atualizar({
        cadastroConcluidoEm: usuario.cadastroConcluidoEm,
        cadastroPendente: false,
        dadosCadastroPendentes: [],
      });
      limparEtapa();
      navigate({ to: "/feed" });
    } catch (erro) {
      // Antes a falha era engolida e a pessoa ia para o feed como se tivesse terminado. Agora vê o que
      // houve; o servidor diz exatamente o que falta. As preferências de acessibilidade já foram salvas
      // pelo próprio painel, então nada se perde ao tentar de novo.
      toast.error(extrairMensagemErro(erro, t("cadastro.comuns.naoFoiPossivelConcluirOCadastro")));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PassosCadastro passos={passos} atual={indice} />
      <TituloEtapa
        titulo={t("cadastro.comuns.deixeOAcessoDoSeuJeito")}
        descricao={t("cadastro.comuns.ajusteOQuePrecisarEVejaO")}
      />

      <PainelAcessibilidade />

      <Button type="button" className="mt-8 min-h-12 w-full text-base" disabled={enviando} onClick={finalizar}>
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> {t("cadastro.comuns.finalizando2")}
          </>
        ) : (
          <>
            {tx("Finalizar cadastro")}{" "}<ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </div>
  );
}


/**
 * O que falta depois de criar a conta da empresa. O texto guarda a CHAVE, e quem desenha a lista a
 * traduz no momento de mostrar — antes ela era escrita direto na tela, e a pessoa lia
 * "cadastro.comuns.dadosDaEmpresa" em vez de "Dados da empresa".
 */
const ETAPAS_DEPOIS_DO_CADASTRO_DA_EMPRESA: ReadonlyArray<{ feito: boolean; texto: ChaveBase; agora?: boolean }> = [
  { feito: true, texto: "cadastro.comuns.dadosDaEmpresa" },
  { feito: false, texto: "cadastro.comuns.confirmarOEMail", agora: true },
  { feito: false, texto: "cadastro.comuns.entrarNaSuaConta" },
  { feito: false, texto: "cadastro.comuns.analiseDoCadastroPelaEquipeDo" },
];

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
  const { t } = useIdioma();
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
      toast.success(t("cadastro.comuns.umNovoEMailDeConfirmacao"));
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t("cadastro.comuns.naoFoiPossivelReenviarOEMail")));
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
          {t("cadastro.comuns.faltaConfirmarSeuEMail")}
        </h1>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        <Frase
          chave="cadastro.comuns.suaContaFoiCriadaConfirme"
          vars={{ email }}
          partes={[(texto) => <strong className="text-foreground">{texto}</strong>]}
        />
      </p>

      <ol className="mt-5 space-y-3" aria-label={t("cadastro.comuns.oQueFaltaParaTerminarOCadastro")}>
        {ETAPAS_DEPOIS_DO_CADASTRO_DA_EMPRESA.map((item, indice) => (
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
              {t(item.texto)}
            </span>
            {/* Estado em texto, nunca só pela cor nem pelo ✓. */}
            <span className="sr-only">
              {item.feito ? tx("concluído") : item.agora ? tx("é o que falta agora") : tx("ainda não feito")}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-sm text-muted-foreground">
        {t("cadastro.comuns.prefereDigitarOCodigo")}{" "}
        <Link to="/confirmar-email" search={{ email }} className="font-semibold text-primary underline">
          {t("cadastro.comuns.confirmarPorCodigo")}
        </Link>
        .
      </p>
      <p className="mt-4 rounded-lg bg-primary-soft px-3 py-2 text-sm">
        {t("cadastro.comuns.depoisDeEntrarRetomamosSeu")}
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
            <Loader2 className="animate-spin" aria-hidden="true" /> {t("cadastro.comuns.reenviando2")}
          </>
        ) : reenviado ? (
          tx("E-mail reenviado")
        ) : (
          tx("Reenviar e-mail")
        )}
      </Button>
    </div>
  );
}
