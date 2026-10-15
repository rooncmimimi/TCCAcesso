import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2, Mail, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { AxiosError } from "axios";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessao } from "@/hooks/useSessao";
import { destinoAposEntrar } from "@/lib/destinoAposEntrar";
import googleService from "@/services/google.service";
import { extrairMensagemErro } from "@/services/api";

/**
 * Retorno da autenticação do Google.
 *
 * Rota de topo, e não `/entrar/google`: com `routes/entrar.tsx` existindo, aquele caminho virava
 * filho dele, e como a tela de login não tem `<Outlet/>` o filho nunca renderizava — a URL mudava
 * e a pessoa continuava vendo o formulário de login, sem nada acontecer.
 *
 * O backend redireciona o navegador para cá com um código de entrega (vale 15 minutos) ou com um
 * erro. Esta tela troca o código pelo desfecho e segue:
 *
 * - **entrar** — conta já vinculada. A sessão começa pela **mesma rotina do login por senha**
 *   (`iniciarSessao`) e o destino é o mesmo (`destinoAposEntrar`): retomar cadastro por terminar,
 *   painel do administrador ou feed. Conta pausada pergunta se quer reativar, e conta bloqueada
 *   mostra o motivo que o servidor mandou;
 * - **conflito** — já existe conta ACESSO com aquele e-mail sem Google vinculado: pede para entrar
 *   com a senha, porque vincular só pelo e-mail deixaria qualquer um assumir a conta alheia;
 * - **cadastrar** — não há conta: segue direto para o cadastro de candidato, levando o código de
 *   entrega. Não há tela perguntando "candidato ou empresa" porque toda conta no ACESSO começa como
 *   candidato — a conta da empresa é uma segunda conta, criada a partir dela.
 *
 * O código sai da barra de endereço assim que é lido: ele traz e-mail e nome do Google, e não há
 * por que deixá-lo no histórico do navegador. Fica só na memória da tela, que é de onde a
 * reativação de conta pausada o reenvia.
 */
export const Route = createFileRoute("/retorno-google")({
  validateSearch: z.object({
    codigo: z.string().optional(),
    erro: z.enum(["cancelado", "falha"]).optional(),
  }),
  head: () => ({ meta: [{ title: "Entrando com Google — ACESSO" }] }),
  component: RetornoGoogle,
});

const FALHA_GENERICA = "Não foi possível concluir a entrada com o Google. Tente novamente.";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "falha"; texto: string }
  | { tipo: "conflito"; email: string }
  | { tipo: "pausada" }
  | { tipo: "emailNaoVerificado"; email: string };

/**
 * A mensagem do servidor só aparece para erro **da pessoa ou da conta** (4xx): "Conta bloqueada:
 * motivo", "Sessão do Google expirada", "O Google não confirmou o e-mail". Erro de servidor ou de
 * rede (sem resposta) fica com o texto genérico, que não vaza detalhe interno.
 */
function mensagemDaFalha(erro: unknown): string {
  const status = (erro as AxiosError | undefined)?.response?.status;
  return status !== undefined && status >= 400 && status < 500 ? extrairMensagemErro(erro, FALHA_GENERICA) : FALHA_GENERICA;
}

/** Tira `?codigo=` da barra de endereço sem recarregar a página nem mexer no histórico do roteador. */
function tirarCodigoDaUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("codigo")) return;
    url.searchParams.delete("codigo");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Sem History API: segue com o código na barra, que é como era.
  }
}

function estadoInicial(codigo: string | undefined, erro: "cancelado" | "falha" | undefined): Estado {
  if (erro === "cancelado") return { tipo: "falha", texto: "Você cancelou a entrada com o Google." };
  if (erro === "falha") return { tipo: "falha", texto: FALHA_GENERICA };
  if (!codigo) {
    return {
      tipo: "falha",
      texto: "Não encontramos o código de entrada do Google nesta página. Volte para o login e tente novamente.",
    };
  }
  return { tipo: "carregando" };
}

function RetornoGoogle() {
  const { codigo, erro } = Route.useSearch();
  const navigate = useNavigate();
  const { iniciarSessao } = useSessao();
  const [estado, setEstado] = useState<Estado>(() => estadoInicial(codigo, erro));
  const [reativando, setReativando] = useState(false);
  // Em desenvolvimento o React monta duas vezes; sem isto o código seria trocado duas vezes.
  const jaTrocou = useRef(false);
  // O código, guardado na memória da tela depois de sair da barra de endereço.
  const codigoRef = useRef<string | undefined>(undefined);

  async function trocar(codigoDeEntrega: string, confirmarReativacao = false) {
    try {
      const retorno = await googleService.concluir(codigoDeEntrega, confirmarReativacao);

      if (retorno.desfecho === "conflito") {
        setEstado({ tipo: "conflito", email: retorno.email });
        return;
      }

      // Sem conta ainda: vai direto montar a conta de candidato, sem tela intermediária. O código de
      // entrega segue na URL do cadastro porque é ele que, no fim do wizard, vincula a conta Google
      // à conta criada — o vínculo é feito pelo `sub` que o servidor reconfere, não por nada daqui.
      // `depois=empresa` preserva a intenção de quem entrou por "Sou empresa": ela veio dentro do
      // `state` assinado pelo backend, então não é um parâmetro que alguém troque no caminho.
      // `replace` evita que o botão "voltar" caia nesta tela de passagem.
      if (retorno.desfecho === "cadastrar") {
        navigate({
          to: "/cadastro/candidato",
          search: { google: retorno.codigo, depois: retorno.tipoConta === "empresa" ? "empresa" : undefined },
          replace: true,
        });
        return;
      }

      const resultado = await iniciarSessao(retorno);

      if ("contaPausada" in resultado) {
        setEstado({ tipo: "pausada" });
        return;
      }

      if ("emailNaoVerificado" in resultado) {
        setEstado({ tipo: "emailNaoVerificado", email: resultado.email });
        return;
      }

      toast.success("Login realizado com sucesso!");
      // `replace`: o botão "voltar" não pode reabrir esta tela de passagem e abrir outra sessão.
      navigate({ ...destinoAposEntrar(resultado), replace: true });
    } catch (falha) {
      setEstado({ tipo: "falha", texto: mensagemDaFalha(falha) });
    }
  }

  useEffect(() => {
    if (!codigo || estado.tipo !== "carregando" || jaTrocou.current) return;
    jaTrocou.current = true;
    codigoRef.current = codigo;
    tirarCodigoDaUrl();
    void trocar(codigo);
    // `trocar` só usa valores estáveis (`navigate`, `iniciarSessao`) e o `codigo` já lido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, estado.tipo]);

  async function reativar() {
    if (!codigoRef.current || reativando) return;
    setReativando(true);
    await trocar(codigoRef.current, true);
    setReativando(false);
  }

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
          <Logo />
        </Link>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {estado.tipo === "falha" ? (
            <Aviso titulo="Não deu certo" texto={estado.texto}>
              <VoltarParaOLogin />
            </Aviso>
          ) : estado.tipo === "conflito" ? (
            <Aviso
              titulo="Esta conta já existe no ACESSO"
              texto={`Já há uma conta com o e-mail ${estado.email}, criada com e-mail e senha. Entre com ela. Por segurança, o ACESSO não junta duas contas só porque o e-mail é igual.`}
            >
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">Entrar com e-mail e senha</Link>
              </Button>
            </Aviso>
          ) : estado.tipo === "pausada" ? (
            <Aviso
              titulo="Sua conta está pausada"
              texto="Você pausou esta conta anteriormente. Deseja reativá-la e continuar?"
              icone={<PauseCircle className="size-5" />}
              falar="Sua conta está pausada. Deseja reativá-la agora?"
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
              titulo="Confirme seu e-mail"
              texto={`Enviamos um e-mail de confirmação para ${estado.email}. Verifique sua caixa de entrada e também a pasta de spam, e clique no link antes de entrar.`}
              icone={<Mail className="size-5" />}
              falar="Confirme seu e-mail antes de entrar."
            >
              <VoltarParaOLogin />
            </Aviso>
          ) : (
            <div className="flex items-center gap-3 py-6" role="status">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Confirmando sua conta Google…</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}

function VoltarParaOLogin({ variante }: { variante?: "ghost" }) {
  return (
    <Button asChild variant={variante} className={variante ? "mt-2 min-h-11 w-full" : "min-h-12 w-full text-base"}>
      <Link to="/entrar">Voltar para o login</Link>
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
