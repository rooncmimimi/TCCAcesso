import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessao } from "@/hooks/useSessao";
import googleService, { type ResultadoGoogle } from "@/services/google.service";
import { definirTokens } from "@/services/api";
import { metaPagina, SeletorIdioma, dic, useT } from "@/i18n";

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
 * - **cadastrar** — não há conta: segue direto para o cadastro de candidato, levando o código de
 *   entrega. Não há tela perguntando "candidato ou empresa" porque toda conta no ACESSO começa como
 *   candidato — a conta da empresa é uma segunda conta, criada a partir dela.
 */
export const Route = createFileRoute("/retorno-google")({
  validateSearch: z.object({
    codigo: z.string().optional(),
    erro: z.enum(["cancelado", "falha"]).optional(),
  }),
  head: () => metaPagina(dic().auth.google.retorno.meta),
  component: RetornoGoogle,
});

function RetornoGoogle() {
  const t = useT();
  const tg = t.auth.google.retorno;
  const { codigo, erro } = Route.useSearch();
  const navigate = useNavigate();
  const { recarregar } = useSessao();
  const [resultado, setResultado] = useState<ResultadoGoogle | null>(null);
  const [falha, setFalha] = useState<string | null>(
    erro === "cancelado" ? tg.cancelou : erro === "falha" ? tg.falha : null,
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
        if (retorno.desfecho === "conflito") {
          setResultado(retorno);
          return;
        }

        // Sem conta ainda: vai direto montar a conta de candidato, sem tela intermediária. O código
        // de entrega segue na URL porque é ele que, no fim do wizard, vincula a conta Google à conta
        // criada — o vínculo é feito pelo `sub` que o servidor reconfere, não por nada daqui.
        // `depois=empresa` preserva a intenção de quem entrou por "Sou empresa": ela veio dentro do
        // `state` assinado pelo backend, então não é um parâmetro que alguém troque no caminho.
        // `replace` evita que o botão "voltar" caia nesta tela de passagem, que já gastou o código.
        if (retorno.desfecho === "cadastrar") {
          navigate({
            to: "/cadastro/candidato",
            search: {
              google: retorno.codigo,
              depois: retorno.tipoConta === "empresa" ? "empresa" : undefined,
            },
            replace: true,
          });
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
        setFalha(tg.falha);
      });
  }, [codigo, falha, navigate, recarregar, tg.falha]);

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label={t.auth.voltarInicioAria} className="inline-flex">
          <Logo />
        </Link>
        <SeletorIdioma compacto id="seletor-idioma-auth" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {falha ? (
            <Aviso titulo={tg.naoDeuCerto} texto={falha}>
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">{tg.voltarLogin}</Link>
              </Button>
            </Aviso>
          ) : resultado?.desfecho === "conflito" ? (
            <Aviso
              titulo={tg.jaExiste}
              texto={tg.textoConflito(resultado.email)}
            >
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">{tg.entrarComSenha}</Link>
              </Button>
            </Aviso>
          ) : (
            <div className="flex items-center gap-3 py-6" role="status">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{tg.confirmando}</p>
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
