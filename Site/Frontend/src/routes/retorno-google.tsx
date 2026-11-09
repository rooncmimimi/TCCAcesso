import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2, Mail, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessao } from "@/hooks/useSessao";
import { destinoAposEntrar } from "@/lib/destinoAposEntrar";
import { guardarVerificacao } from "@/lib/verificacaoDispositivo";
import { VERSAO_DOCUMENTOS } from "@/dados/documentosLegais";
import {
  guardarProva,
  lerCodigoDoFragmento,
  lerVinculo,
  limparProva,
  limparVinculo,
  tirarCodigoDaUrl,
} from "@/lib/googleNavegador";
import type { ChaveBase } from "@/i18n/dicionarios";
import { useIdioma } from "@/hooks/useIdioma";
import googleService, { mensagemDeErroGoogle } from "@/services/google.service";

/**
 * Retorno da autenticação do Google.
 *
 * Rota de topo, e não `/entrar/google`: com `routes/entrar.tsx` existindo, aquele caminho virava
 * filho dele, e como a tela de login não tem `<Outlet/>` o filho nunca renderizava — a URL mudava
 * e a pessoa continuava vendo o formulário de login, sem nada acontecer.
 *
 * O backend redireciona o navegador para cá com um código de entrega ou com um erro. O código vem
 * no **fragmento** da URL (`#codigo=…`), que o navegador não envia a servidor nenhum, e o erro vem
 * na query (`?erro=`). Esta tela troca o código pelo desfecho e segue:
 *
 * - **entrar** — conta já vinculada. A sessão começa pela **mesma rotina do login por senha**
 *   (`iniciarSessao`) e o destino é o mesmo (`destinoAposEntrar`): retomar cadastro por terminar,
 *   painel do administrador ou feed. Conta pausada pergunta se quer reativar, e conta bloqueada
 *   mostra o motivo que o servidor mandou;
 * - **conflito** — já existe conta ACESSO com aquele e-mail sem Google vinculado: pede para entrar
 *   com a senha, porque vincular só pelo e-mail deixaria qualquer um assumir a conta alheia;
 * - **cadastrar** — não há conta: guarda a prova do Google na aba (`lib/googleNavegador`, nunca na
 *   URL). Com a criação sem senha ligada no servidor (`contaSemSenha`), a conta nasce aqui mesmo,
 *   sem tela nenhuma (o aviso dos Termos está no botão do Google) e a pessoa segue para
 *   `/cadastro/dados`; se a criação falhar, cai em `/cadastro/google`, que permite tentar de novo.
 *   Sem a chave, segue para o cadastro de candidato de sempre, com senha. Não há tela perguntando "candidato ou empresa"
 *   porque toda conta no ACESSO começa como candidato — a conta da empresa é uma segunda conta,
 *   criada a partir dela.
 *
 * O código só vale no navegador que começou o fluxo e uma única vez: o Site o apresenta junto com o
 * segredo guardado no `sessionStorage` da aba (achado 3). Sem esse segredo — o endereço foi colado
 * em outra aba ou outro navegador —, a tela nem chama o servidor e explica o que houve.
 *
 * O código sai da barra de endereço assim que é lido: ele traz e-mail e nome do Google, e não há
 * por que deixá-lo no histórico do navegador. Fica só na memória da tela, que é de onde a
 * reativação de conta pausada o reenvia (o servidor não gasta o código nesse caso).
 */
export const Route = createFileRoute("/retorno-google")({
  validateSearch: z.object({
    codigo: z.string().optional(),
    erro: z.enum(["cancelado", "falha"]).optional(),
  }),
  head: () => ({ meta: [{ title: "Entrando com Google — ACESSO" }] }),
  component: RetornoGoogle,
});

const FALHA_GENERICA: ChaveBase = "retorno-google.naoFoiPossivelConcluirAEntrada";
const OUTRO_NAVEGADOR: ChaveBase = "retorno-google.estaEntradaComOGoogleNaoComecou";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "falha"; texto: string }
  | { tipo: "conflito"; email: string }
  | { tipo: "pausada" }
  | { tipo: "emailNaoVerificado"; email: string };

const mensagemDaFalha = (erro: unknown, t: (chave: ChaveBase) => string) => mensagemDeErroGoogle(erro, t(FALHA_GENERICA));

/**
 * O código de entrega, no fragmento (`#codigo=`), que é onde o backend o coloca. A query
 * (`?codigo=`) ainda é aceita: era o formato anterior, e um retorno em andamento durante a troca de
 * versão não deve quebrar.
 */
const lerCodigoDaUrl = (codigoDaBusca: string | undefined) => lerCodigoDoFragmento() || codigoDaBusca || undefined;

function estadoInicial(
  codigo: string | undefined,
  erro: "cancelado" | "falha" | undefined,
  comecouNesteNavegador: boolean,
  t: (chave: ChaveBase) => string,
): Estado {
  if (erro === "cancelado") return { tipo: "falha", texto: t("retorno-google.voceCancelouAEntradaComOGoogle") };
  if (erro === "falha") return { tipo: "falha", texto: t(FALHA_GENERICA) };
  if (!codigo) {
    return {
      tipo: "falha",
      texto: t("retorno-google.naoEncontramosOCodigoDeEntrada"),
    };
  }
  // Sem o segredo da aba o servidor recusaria o código; poupa a ida e a mensagem fica a mesma.
  if (!comecouNesteNavegador) return { tipo: "falha", texto: t(OUTRO_NAVEGADOR) };
  return { tipo: "carregando" };
}

function RetornoGoogle() {
  const { t } = useIdioma();
  const { codigo: codigoDaBusca, erro } = Route.useSearch();
  const navigate = useNavigate();
  const { iniciarSessao } = useSessao();
  // Lido uma vez, antes de o código sair da barra de endereço.
  const [inicial] = useState(() => {
    const codigo = lerCodigoDaUrl(codigoDaBusca);
    return { codigo, estado: estadoInicial(codigo, erro, lerVinculo() !== null, t) };
  });
  const [estado, setEstado] = useState<Estado>(inicial.estado);
  const [reativando, setReativando] = useState(false);
  // Em desenvolvimento o React monta duas vezes; sem isto o código seria trocado duas vezes.
  const jaTrocou = useRef(false);
  // O código, guardado na memória da tela depois de sair da barra de endereço.
  const codigoRef = useRef<string | undefined>(undefined);

  async function trocar(codigoDeEntrega: string, confirmarReativacao = false) {
    try {
      const retorno = await googleService.concluir(codigoDeEntrega, confirmarReativacao);

      if (retorno.desfecho === "conflito") {
        limparVinculo();
        setEstado({ tipo: "conflito", email: retorno.email });
        return;
      }

      // Sem conta ainda: vai direto montar a conta de candidato, sem tela intermediária. A prova do
      // Google fica na aba, e não na URL: é ela que, no fim do wizard, vincula a conta Google à
      // conta criada — o vínculo é feito pelo `sub` que o servidor reconfere, não por nada daqui.
      // `depois=empresa` preserva a intenção de quem entrou por "Sou empresa": ela veio dentro do
      // `state` assinado pelo backend, então não é um parâmetro que alguém troque no caminho.
      // `replace` evita que o botão "voltar" caia nesta tela de passagem.
      if (retorno.desfecho === "cadastrar") {
        limparVinculo();
        if (!guardarProva(retorno.prova)) {
          setEstado({ tipo: "falha", texto: t(FALHA_GENERICA) });
          return;
        }
        const depois = retorno.tipoConta === "empresa" ? "empresa" : undefined;

        // A conta nasce aqui, sem tela de aceite: o aviso dos Termos e da Privacidade está no botão
        // "Continuar com Google" (`BotaoGoogle`), que a pessoa acabou de usar. O servidor é quem
        // reconfere a prova, o e-mail verificado e a versão dos documentos.
        if (retorno.contaSemSenha) {
          let sessaoNova: Awaited<ReturnType<typeof googleService.cadastrar>>;
          try {
            sessaoNova = await googleService.cadastrar(retorno.prova, VERSAO_DOCUMENTOS);
          } catch {
            // Não deu para criar agora: a tela de sempre deixa a pessoa tentar de novo ou escolher o cadastro com senha.
            navigate({ to: "/cadastro/google", search: { depois }, replace: true });
            return;
          }
          // A prova cumpriu o papel e não deve ficar na aba para outro cadastro.
          limparProva();
          await iniciarSessao(sessaoNova);
          toast.success("Conta criada com o Google.");
          navigate({ to: "/cadastro/dados", search: { depois }, replace: true });
          return;
        }

        navigate({ to: "/cadastro/candidato", search: { google: true, depois }, replace: true });
        return;
      }

      const resultado = await iniciarSessao(retorno);

      // O Google provou quem é, mas este aparelho não é reconhecido: o código de 6 números foi para o e-mail da conta.
      if ("verificacaoDispositivo" in resultado) {
        limparVinculo();
        guardarVerificacao({
          desafio: resultado.desafioDispositivo,
          emailMascarado: resultado.emailMascarado,
          reenvioEmSegundos: resultado.reenvioEmSegundos,
        });
        navigate({ to: "/verificacao-de-dispositivo", replace: true });
        return;
      }

      // Conta pausada é a única resposta em que a pessoa ainda reapresenta o código (o botão de
      // reativar), então só nela o segredo da aba continua valendo.
      if ("contaPausada" in resultado) {
        setEstado({ tipo: "pausada" });
        return;
      }

      limparVinculo();

      if ("emailNaoVerificado" in resultado) {
        setEstado({ tipo: "emailNaoVerificado", email: resultado.email });
        return;
      }

      toast.success("Login realizado com sucesso!");
      // `replace`: o botão "voltar" não pode reabrir esta tela de passagem e abrir outra sessão.
      navigate({ ...destinoAposEntrar(resultado), replace: true });
    } catch (falha) {
      // Não há botão de "tentar de novo" aqui: a pessoa volta ao login e começa outro fluxo, com outro segredo.
      limparVinculo();
      setEstado({ tipo: "falha", texto: mensagemDaFalha(falha, t) });
    }
  }

  useEffect(() => {
    tirarCodigoDaUrl();
    // Um fluxo que já nasceu encerrado (cancelou, falhou, veio de outro navegador): o segredo não serve mais.
    if (inicial.estado.tipo === "falha") limparVinculo();
  }, [inicial]);

  useEffect(() => {
    if (!inicial.codigo || inicial.estado.tipo !== "carregando" || jaTrocou.current) return;
    jaTrocou.current = true;
    codigoRef.current = inicial.codigo;
    void trocar(inicial.codigo);
    // `trocar` só usa valores estáveis (`navigate`, `iniciarSessao`) e o código já lido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial]);

  async function reativar() {
    if (!codigoRef.current || reativando) return;
    setReativando(true);
    await trocar(codigoRef.current, true);
    setReativando(false);
  }

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label={t("retorno-google.voltarParaAPaginaInicial")} className="inline-flex">
          <Logo />
        </Link>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {estado.tipo === "falha" ? (
            <Aviso titulo={t("retorno-google.naoDeuCerto")} texto={estado.texto}>
              <VoltarParaOLogin />
            </Aviso>
          ) : estado.tipo === "conflito" ? (
            <Aviso
              titulo={t("retorno-google.estaContaJaExisteNoAcesso")}
              texto={`Já há uma conta com o e-mail ${estado.email}, criada com e-mail e senha. Entre com ela. Se for uma conta de candidato, depois de entrar você pode vincular o Google em Configurações, Segurança, Contas conectadas. Por segurança, o ACESSO não junta duas contas só porque o e-mail é igual.`}
            >
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">{t("retorno-google.entrarComEMailESenha")}</Link>
              </Button>
            </Aviso>
          ) : estado.tipo === "pausada" ? (
            <Aviso
              titulo={t("login.contaPausada")}
              texto={t("login.contaPausadaTexto")}
              icone={<PauseCircle className="size-5" />}
              falar={t("login.contaPausadaVoz")}
            >
              <Button type="button" className="min-h-12 w-full text-base" disabled={reativando} onClick={reativar}>
                {reativando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> Reativando…
                  </>
                ) : (
                  "Reativar minha conta"
                )}
              </Button>
              <VoltarParaOLogin variante="ghost" />
            </Aviso>
          ) : estado.tipo === "emailNaoVerificado" ? (
            <Aviso
              titulo={t("login.confirmeEmail")}
              texto={`Enviamos um e-mail de confirmação para ${estado.email}. Verifique sua caixa de entrada e também a pasta de spam, e clique no link antes de entrar.`}
              icone={<Mail className="size-5" />}
              falar={t("login.confirmeEmailVoz")}
            >
              <VoltarParaOLogin />
            </Aviso>
          ) : (
            <div className="flex items-center gap-3 py-6" role="status">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{t("retorno-google.confirmandoSuaContaGoogle")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}

function VoltarParaOLogin({ variante }: { variante?: "ghost" }) {
  const { t } = useIdioma();
  return (
    <Button asChild variant={variante} className={variante ? "mt-2 min-h-11 w-full" : "min-h-12 w-full text-base"}>
      <Link to="/entrar">{t("retorno-google.voltarParaOLogin")}</Link>
    </Button>
  );
}

function Aviso({
  titulo,
  texto,
  icone = <AlertTriangle className="size-5" />,
  falar,
  children,
}: {
  titulo: string;
  texto: string;
  icone?: ReactNode;
  /** Frase que o leitor de voz do ACESSO fala no lugar do texto do título (`data-speak`). */
  falar?: string;
  children: ReactNode;
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          {icone}
        </span>
        <h1 ref={tituloRef} tabIndex={-1} data-speak={falar} className="text-xl font-extrabold outline-none">
          {titulo}
        </h1>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{texto}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
