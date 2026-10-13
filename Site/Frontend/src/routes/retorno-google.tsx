import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Building2, Loader2, User } from "lucide-react";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessao } from "@/hooks/useSessao";
import googleService, { type ResultadoGoogle } from "@/services/google.service";
import { definirTokens } from "@/services/api";

/**
 * Retorno da autenticação do Google.
 *
 * Rota de topo, e não `/entrar/google`: com `routes/entrar.tsx` existindo, aquele caminho virava
 * filho dele, e como a tela de login não tem `<Outlet/>` o filho nunca renderizava — a URL mudava
 * e a pessoa continuava vendo o formulário de login, sem nada acontecer.
 *
 * O backend redireciona o navegador para cá com um código de entrega de um minuto (ou com um erro).
 * Esta tela troca o código pelo desfecho e segue:
 *
 * - **entrar** — conta já vinculada: sessão criada e vai para onde o tipo de conta mandar, incluindo
 *   a retomada do cadastro quando ele não terminou;
 * - **conflito** — já existe conta ACESSO com aquele e-mail sem Google vinculado: pede para entrar
 *   com a senha, porque vincular só pelo e-mail deixaria qualquer um assumir a conta alheia;
 * - **cadastrar** — não há conta: pergunta se é candidato ou empresa, em vez de criar um tipo por
 *   conta própria.
 */
export const Route = createFileRoute("/retorno-google")({
  validateSearch: z.object({
    codigo: z.string().optional(),
    erro: z.enum(["cancelado", "falha"]).optional(),
  }),
  head: () => ({ meta: [{ title: "Entrando com Google — ACESSO" }] }),
  component: RetornoGoogle,
});

function RetornoGoogle() {
  const { codigo, erro } = Route.useSearch();
  const navigate = useNavigate();
  const { recarregar } = useSessao();
  const [resultado, setResultado] = useState<ResultadoGoogle | null>(null);
  const [falha, setFalha] = useState<string | null>(
    erro === "cancelado"
      ? "Você cancelou a entrada com o Google."
      : erro === "falha"
        ? "Não foi possível concluir a entrada com o Google. Tente novamente."
        : null,
  );
  // Em desenvolvimento o React monta duas vezes; sem isto o código de uso único seria trocado duas
  // vezes e a segunda falharia.
  const jaTrocou = useRef(false);

  useEffect(() => {
    if (!codigo || falha || jaTrocou.current) return;
    jaTrocou.current = true;

    googleService
      .concluir(codigo)
      .then(async (retorno) => {
        if (retorno.desfecho !== "entrar") {
          setResultado(retorno);
          return;
        }

        definirTokens(retorno.token, retorno.refreshToken);
        await recarregar();

        const usuario = retorno.usuario;
        if (usuario.tipo === "candidato" && !usuario.cadastroConcluidoEm) {
          navigate({ to: "/cadastro/candidato", search: { retomar: true } });
          return;
        }
        navigate({ to: usuario.tipo === "administrador" ? "/admin" : "/feed" });
      })
      .catch(() => {
        setFalha("Não foi possível concluir a entrada com o Google. Tente novamente.");
      });
  }, [codigo, falha, navigate, recarregar]);

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
          <Logo />
        </Link>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {falha ? (
            <Aviso titulo="Não deu certo" texto={falha}>
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">Voltar para o login</Link>
              </Button>
            </Aviso>
          ) : resultado?.desfecho === "conflito" ? (
            <Aviso
              titulo="Esta conta já existe no ACESSO"
              texto={`Já há uma conta com o e-mail ${resultado.email}, criada com senha. Entre com ela — depois você pode vincular o Google nas configurações. Vincular só porque o e-mail coincide deixaria sua conta exposta.`}
            >
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">Entrar com e-mail e senha</Link>
              </Button>
            </Aviso>
          ) : resultado?.desfecho === "cadastrar" ? (
            <EscolherTipo resultado={resultado} />
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

function Aviso({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"
        >
          <AlertTriangle className="size-5" />
        </span>
        <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
          {titulo}
        </h1>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{texto}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

/**
 * Conta Google sem conta ACESSO: a pessoa escolhe o tipo.
 *
 * O tipo nunca é escolhido pelo sistema nem vem de parâmetro de URL — candidato e empresa têm
 * regras e permissões diferentes, e errar aqui daria a alguém um papel que não é o dela.
 */
function EscolherTipo({ resultado }: { resultado: Extract<ResultadoGoogle, { desfecho: "cadastrar" }> }) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <div>
      <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
        Falta só escolher o tipo de conta
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {resultado.perfil.email
          ? `Confirmamos sua conta Google (${resultado.perfil.email}), mas ela ainda não tem cadastro no ACESSO.`
          : "Confirmamos sua conta Google, mas ela ainda não tem cadastro no ACESSO."}{" "}
        Os dois cadastros são diferentes — escolha o que combina com você.
      </p>

      <div className="mt-6 grid gap-3">
        <Button asChild variant="outline" className="min-h-14 justify-start gap-3 text-base">
          {/* O código segue junto: é ele que vincula a conta Google à conta criada. */}
          <Link to="/cadastro/candidato" search={{ google: resultado.codigo }}>
            <User aria-hidden="true" /> Criar conta de candidato
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-14 justify-start gap-3 text-base">
          <Link to="/cadastro/candidato" search={{ google: resultado.codigo, depois: "empresa" }}>
            <Building2 aria-hidden="true" /> Criar conta de empresa
          </Link>
        </Button>
      </div>

      <p className="mt-5 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
        O Google informa apenas nome e e-mail. CPF, país, telefone e os dados da empresa continuam
        sendo preenchidos por você — nada disso é adivinhado.
      </p>
    </div>
  );
}
